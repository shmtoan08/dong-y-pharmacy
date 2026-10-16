import { db, withTransaction } from "@/lib/db";
import { normalizeHerbKey } from "@/lib/herb-key";
import { evaluatePrescriptionSafety } from "./queries";
import type { PrescriptionDraftInput } from "./schemas";
import type { SessionUser } from "@/lib/auth";

/** Sinh mã DT-YYYYMMDD-XXX, atomic qua next_daily_n() */
export async function nextPrescriptionCode(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const { rows } = await db.query<{ next_daily_n: number }>(
    `SELECT next_daily_n($1, 'prescription')`,
    [today],
  );
  const ymd = today.replace(/-/g, "");
  return `DT-${ymd}-${String(rows[0].next_daily_n).padStart(3, "0")}`;
}

/**
 * Transaction tạo đơn thuốc nháp kèm các vị thuốc
 */
export async function createPrescriptionDraftTx(
  user: SessionUser,
  d: PrescriptionDraftInput,
): Promise<{ prescriptionId: string; code: string }> {
  const code = await nextPrescriptionCode();

  const prescriptionId = await withTransaction(async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      `INSERT INTO prescriptions
         (prescription_code, visit_id, practitioner_id, template_id,
          template_version, num_of_packs, usage_instruction, doctor_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        code,
        d.visit_id,
        user.id,
        d.template_id,
        d.template_version,
        d.num_of_packs,
        d.usage_instruction?.trim() || null,
        d.doctor_notes?.trim() || null,
      ],
    );
    const pid = rows[0].id;
    for (const it of d.items) {
      const herbName = it.herb_name.trim();
      const herbKey = normalizeHerbKey(it.herb_name);
      let herbId: string | null = null;
      if (it.herb_id) {
        const { rows: hv } = await tx.query(
          `SELECT id FROM herbs WHERE id = $1 AND is_active = true`,
          [it.herb_id],
        );
        if (hv.length > 0) herbId = hv[0].id;
      }
      await tx.query(
        `INSERT INTO prescription_items
           (prescription_id, herb_id, herb_name, herb_name_key, weight_per_pack, note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [pid, herbId, herbName, herbKey, it.weight_per_pack, it.note?.trim() || null],
      );
      if (!herbId) {
        await tx.query(
          `INSERT INTO herb_migration_mappings (source_text, normalized_key, herb_id, confidence)
           VALUES ($1, $2,
             (SELECT id FROM herbs WHERE canonical_key = $2 AND is_active = true
              UNION ALL
              SELECT herb_id FROM herb_aliases WHERE alias_key = $2
              LIMIT 1),
             CASE WHEN EXISTS (
               SELECT 1 FROM herbs WHERE canonical_key = $2 AND is_active = true
               UNION ALL
               SELECT 1 FROM herb_aliases WHERE alias_key = $2
             ) THEN '1.00' ELSE NULL END)
           ON CONFLICT (source_text, normalized_key) DO NOTHING`,
          [herbName, herbKey],
        );
      }
    }
    return pid;
  });

  return { prescriptionId, code };
}

/**
 * Transaction chốt đơn: atomic UPDATE draft -> confirmed + kiểm tra tương kỵ + tạo snapshot
 */
export async function confirmPrescriptionTx(
  user: SessionUser,
  id: string,
): Promise<void> {
  await withTransaction(async (tx) => {
    // 1. Chuyển trạng thái — chỉ thành công khi đang là draft
    const { rowCount } = await tx.query(
      `UPDATE prescriptions
       SET status = 'confirmed', confirmed_at = NOW(), confirmed_by = $1
       WHERE id = $2 AND status = 'draft'`,
      [user.id, id],
    );
    if (rowCount === 0) {
      throw new Error("ALREADY_PROCESSED");
    }

    // 1b. Kiểm tra an toàn lâm sàng (re-check server-side trong transaction)
    const safety = await evaluatePrescriptionSafety(id, tx);
    if (safety.blocking.length > 0) {
      const names = safety.blocking
        .map((b) => `${b.herb_a_name} + ${b.herb_b_name}`)
        .join("; ");
      throw new Error(`BLOCKED_INTERACTION:${names}`);
    }

    // 2. Lấy dữ liệu đầy đủ để snapshot (trong cùng transaction)
    const { rows: pr } = await tx.query(
      `SELECT p.prescription_code, p.num_of_packs, p.usage_instruction, p.doctor_notes,
              p.confirmed_at, p.visit_id, p.practitioner_id, v.visited_at,
              pt.id AS patient_id, pt.patient_code, pt.full_name AS patient_name,
              pt.date_of_birth, pt.phone,
              u.full_name AS practitioner_name
       FROM prescriptions p
       JOIN visits v ON v.id = p.visit_id
       JOIN patients pt ON pt.id = v.patient_id
       JOIN users u ON u.id = p.practitioner_id
       WHERE p.id = $1`,
      [id],
    );
    const { rows: items } = await tx.query(
      `SELECT herb_name, herb_name_key, weight_per_pack, note
       FROM prescription_items WHERE prescription_id = $1 ORDER BY id`,
      [id],
    );
    const { rows: confirmer } = await tx.query(
      `SELECT full_name FROM users WHERE id = $1`,
      [user.id],
    );

    const p = pr[0];
    const numPacks = Number(p.num_of_packs);
    const snapshotItems = items.map((it) => {
      const wpp = Number(it.weight_per_pack);
      return {
        herbName: it.herb_name,
        herbNameKey: it.herb_name_key,
        weightPerPack: wpp,
        totalWeight: Math.round(wpp * numPacks * 100) / 100,
        note: it.note,
      };
    });
    const totalAll = Math.round(
      snapshotItems.reduce((s, it) => s + it.totalWeight, 0) * 100,
    ) / 100;

    const snapshot = {
      prescriptionCode: p.prescription_code,
      visitId: p.visit_id,
      visitDate: p.visited_at,
      patient: {
        id: p.patient_id,
        code: p.patient_code,
        name: p.patient_name,
        dob: p.date_of_birth,
        phone: p.phone,
      },
      practitioner: { id: p.practitioner_id ?? null, name: p.practitioner_name },
      confirmedBy: { id: user.id, name: confirmer[0]?.full_name ?? "" },
      confirmedAt: p.confirmed_at,
      items: snapshotItems,
      numOfPacks: numPacks,
      weightUnit: "g",
      totalWeightAll: totalAll,
      usageInstruction: p.usage_instruction,
      doctorNotes: p.doctor_notes,
    };
    await tx.query(
      `INSERT INTO prescription_snapshots (prescription_id, snapshot_data)
       VALUES ($1, $2)`,
      [id, JSON.stringify(snapshot)],
    );
  });
}

/**
 * Transaction bốc thuốc + trừ kho FEFO:
 * - Lock đơn, check status = confirmed
 * - Lock các lot hợp lệ FOR UPDATE
 * - Thuật toán phân bổ First-Expired, First-Out
 * - Trừ tồn kho + ghi sổ lịch sử stock_lot_movements
 * - Chuyển trạng thái đơn -> completed
 */
export async function completePrescriptionTx(
  user: SessionUser,
  id: string,
): Promise<void> {
  await withTransaction(async (tx) => {
    // 1. Lock đơn + check idempotent
    const { rows: rx } = await tx.query<{ num_of_packs: number }>(
      `SELECT num_of_packs FROM prescriptions WHERE id = $1 AND status = 'confirmed' FOR UPDATE`,
      [id],
    );
    if (rx.length === 0) throw new Error("NOT_CONFIRMED");
    const numPacks = Number(rx[0].num_of_packs) || 1;

    // 2. Lấy các vị thuốc có liên kết herb_id
    const { rows: items } = await tx.query<{
      herb_id: string; herb_name: string; weight_per_pack: number;
    }>(
      `SELECT herb_id, herb_name, weight_per_pack FROM prescription_items
       WHERE prescription_id = $1 AND herb_id IS NOT NULL`,
      [id],
    );

    for (const it of items) {
      const needed = Number(it.weight_per_pack) * numPacks;
      if (needed <= 0) continue;

      // 3. Lock các lot (FEFO order, loại lô hết hạn)
      const { rows: lots } = await tx.query<{ id: string; quantity_current: number }>(
        `SELECT id, quantity_current FROM stock_lots
         WHERE herb_id = $1 AND quantity_current > 0
           AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
         ORDER BY expiry_date NULLS LAST, created_at ASC, id ASC
         FOR UPDATE`,
        [it.herb_id],
      );

      // 4. Tính toán phân bổ FEFO
      let rest = needed;
      const plan: { lotId: string; take: number }[] = [];
      for (const l of lots) {
        if (rest <= 0) break;
        const t = Math.min(Number(l.quantity_current), rest);
        plan.push({ lotId: l.id, take: t });
        rest -= t;
      }
      if (rest > 0.0001) {
        throw new Error(`SHORTAGE:${it.herb_name}:${rest.toFixed(2)}`);
      }

      // 5. Trừ kho + ghi log chuyển động kho
      for (const p of plan) {
        await tx.query(
          `UPDATE stock_lots SET quantity_current = quantity_current - $1 WHERE id = $2`,
          [p.take, p.lotId],
        );
        await tx.query(
          `INSERT INTO stock_lot_movements (lot_id, quantity_change, reason, reference_type, reference_id, created_by)
           VALUES ($1, $2, 'dispense', 'PRESCRIPTION', $3, $4)`,
          [p.lotId, -p.take, id, user.id],
        );
      }
    }

    // 6. Đơn thuốc chuyển sang hoàn tất (completed)
    await tx.query(
      `UPDATE prescriptions
       SET status = 'completed', completed_by = $1, completed_at = NOW()
       WHERE id = $2`,
      [user.id, id],
    );
  });
}

/**
 * Transaction tái kê đơn: tạo lượt khám mới + đơn nháp copy từ đơn cũ
 */
export async function reprisePrescriptionTx(
  user: SessionUser,
  sourceId: string,
): Promise<string> {
  // Lấy chi tiết đơn cũ
  const { rows: srcRows } = await db.query(
    `SELECT p.prescription_code, p.num_of_packs, p.usage_instruction, p.doctor_notes,
            v.patient_id
     FROM prescriptions p
     JOIN visits v ON v.id = p.visit_id
     WHERE p.id = $1`,
    [sourceId],
  );
  if (srcRows.length === 0) throw new Error("PRESCRIPTION_NOT_FOUND");
  const src = srcRows[0];

  const { rows: items } = await db.query(
    `SELECT herb_name, herb_name_key, weight_per_pack, note
     FROM prescription_items WHERE prescription_id = $1 ORDER BY id`,
    [sourceId],
  );

  return withTransaction(async (tx) => {
    // 1. Lượt khám mới
    const { rows: vRows } = await tx.query<{ id: string }>(
      `INSERT INTO visits (patient_id, practitioner_id, final_diagnosis, doctor_notes)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        src.patient_id,
        user.id,
        src.doctor_notes || null,
        `Tái khám — bốc lại đơn ${src.prescription_code}`,
      ],
    );
    const visitId = vRows[0].id;

    // 2. Đơn nháp mới
    const code = await nextPrescriptionCode();
    const { rows: pRows } = await tx.query<{ id: string }>(
      `INSERT INTO prescriptions
         (prescription_code, visit_id, practitioner_id, status, num_of_packs, usage_instruction, doctor_notes)
       VALUES ($1, $2, $3, 'draft', $4, $5, $6)
       RETURNING id`,
      [
        code,
        visitId,
        user.id,
        src.num_of_packs,
        src.usage_instruction,
        src.doctor_notes,
      ],
    );
    const newPresId = pRows[0].id;

    // 3. Sao chép các vị thuốc
    for (const it of items) {
      await tx.query(
        `INSERT INTO prescription_items (prescription_id, herb_name, herb_name_key, weight_per_pack, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          newPresId,
          it.herb_name,
          it.herb_name_key || normalizeHerbKey(it.herb_name as string),
          it.weight_per_pack,
          it.note ?? null,
        ],
      );
    }
    return newPresId;
  });
}
