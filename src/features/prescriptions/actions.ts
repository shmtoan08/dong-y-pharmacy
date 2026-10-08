"use server";

import { redirect } from "next/navigation";
import { db, withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { normalizeHerbKey } from "@/lib/herb-key";
import { prescriptionDraftSchema } from "./schemas";

export interface ActionState {
  error?: string;
}

import type { PrescriptionStatus } from "./constants";

/** Sinh mã DT-YYYYMMDD-XXX, atomic qua next_daily_n() */
async function nextPrescriptionCode(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const { rows } = await db.query<{ next_daily_n: number }>(
    `SELECT next_daily_n($1, 'prescription')`,
    [today],
  );
  const ymd = today.replace(/-/g, "");
  return `DT-${ymd}-${String(rows[0].next_daily_n).padStart(3, "0")}`;
}

interface ItemInput {
  herb_name: string;
  weight_per_pack: number;
  note?: string;
}

function parseItems(formData: FormData): ItemInput[] | null {
  const raw = formData.get("items");
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function createPrescriptionDraft(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner");

  const items = parseItems(formData);
  const parsed = prescriptionDraftSchema.safeParse({
    visit_id: formData.get("visit_id"),
    template_id: formData.get("template_id") || null,
    template_version: formData.get("template_version")
      ? Number(formData.get("template_version"))
      : null,
    num_of_packs: Number(formData.get("num_of_packs")),
    usage_instruction: formData.get("usage_instruction") || undefined,
    doctor_notes: formData.get("doctor_notes") || undefined,
    items,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const d = parsed.data;
  const code = await nextPrescriptionCode();

  let prescriptionId: string;
  try {
    prescriptionId = await withTransaction(async (tx) => {
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
        // Nếu chọn từ danh mục mà herb_id không hợp lệ → bỏ qua (dùng text)
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
        // Text tự do (không có herb_id) → tạo mapping pending để duyệt sau
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
  } catch (e) {
    console.error("[createPrescriptionDraft] failed:", e);
    return { error: "Không tạo được đơn thuốc, vui lòng thử lại" };
  }

  await audit({
    userId: user.id,
    action: "CREATE_PRESCRIPTION",
    tableName: "prescriptions",
    rowId: prescriptionId,
    newValue: { code },
  });

  redirect(`/prescriptions/${prescriptionId}`);
}

/**
 * Chốt đơn: atomic — UPDATE status WHERE draft + INSERT snapshot trong 1 transaction.
 * Chống double-confirm bằng rowCount check (theo review ChatGPT).
 */

export interface SafetyInteraction {
  interaction_id: string;
  herb_a_name: string;
  herb_b_name: string;
  severity: "cam_ky" | "can_trong";
  description: string | null;
  overridden: boolean;
}

export interface SafetyDosageWarning {
  herb_name: string;
  daily_dose: number;
  max_daily_dose: number;
}

export interface SafetyResult {
  interactions: SafetyInteraction[];
  dosageWarnings: SafetyDosageWarning[];
  blocking: SafetyInteraction[];
}

/**
 * Hàm domain duy nhất đánh giá an toàn đơn thuốc.
 * Dùng chung cho UI (hiển thị cảnh báo) và confirmPrescription (chặn trong transaction).
 */
export async function evaluatePrescriptionSafety(
  prescriptionId: string,
  tx: { query: typeof db.query },
): Promise<SafetyResult> {
  // Lấy distinct herb_id trong đơn
  const { rows: items } = await tx.query<{ herb_id: string; herb_name: string; weight_per_pack: number }>(
    `SELECT DISTINCT ON (herb_id) herb_id, herb_name, weight_per_pack
     FROM prescription_items WHERE prescription_id = $1 AND herb_id IS NOT NULL`,
    [prescriptionId],
  );
  const { rows: pr } = await tx.query<{ num_of_packs: number }>(
    `SELECT num_of_packs FROM prescriptions WHERE id = $1`,
    [prescriptionId],
  );
  const numPacks = pr.length > 0 ? Number(pr[0].num_of_packs) || 1 : 1;

  const interactions: SafetyInteraction[] = [];
  const herbIds = items.map((i) => i.herb_id);

  // Check từng cặp
  for (let i = 0; i < herbIds.length; i++) {
    for (let j = i + 1; j < herbIds.length; j++) {
      const a = herbIds[i] < herbIds[j] ? herbIds[i] : herbIds[j];
      const b = herbIds[i] < herbIds[j] ? herbIds[j] : herbIds[i];
      const { rows: ix } = await tx.query<{
        id: string; severity: string; description: string | null;
        herb_a_name: string; herb_b_name: string;
      }>(
        `SELECT ix.id, ix.severity, ix.description,
                ha.name_common AS herb_a_name, hb.name_common AS herb_b_name
         FROM herb_interactions ix
         JOIN herbs ha ON ha.id = ix.herb_a_id
         JOIN herbs hb ON hb.id = ix.herb_b_id
         WHERE ix.herb_a_id = $1 AND ix.herb_b_id = $2 AND ix.verified = TRUE`,
        [a, b],
      );
      for (const r of ix) {
        const { rows: ov } = await tx.query(
          `SELECT 1 FROM prescription_interaction_overrides
           WHERE prescription_id = $1 AND interaction_id = $2`,
          [prescriptionId, r.id],
        );
        interactions.push({
          interaction_id: r.id,
          herb_a_name: r.herb_a_name,
          herb_b_name: r.herb_b_name,
          severity: r.severity as "cam_ky" | "can_trong",
          description: r.description,
          overridden: ov.length > 0,
        });
      }
    }
  }

  // Check liều
  const dosageWarnings: SafetyDosageWarning[] = [];
  for (const it of items) {
    const { rows: dl } = await tx.query<{ max_daily_dose: number }>(
      `SELECT max_daily_dose FROM herb_dosage_limits
       WHERE herb_id = $1 AND verified = TRUE AND max_daily_dose IS NOT NULL`,
      [it.herb_id],
    );
    if (dl.length > 0) {
      const dailyDose = Number(it.weight_per_pack) * numPacks;
      const maxDose = Number(dl[0].max_daily_dose);
      if (dailyDose > maxDose) {
        dosageWarnings.push({
          herb_name: it.herb_name,
          daily_dose: dailyDose,
          max_daily_dose: maxDose,
        });
      }
    }
  }

  const blocking = interactions.filter((x) => x.severity === "cam_ky" && !x.overridden);
  return { interactions, dosageWarnings, blocking };
}

/** UI gọi để hiển thị cảnh báo real-time (không lock) */
export async function checkPrescriptionSafety(prescriptionId: string): Promise<SafetyResult> {
  await requireRole("admin", "practitioner", "dispenser");
  return evaluatePrescriptionSafety(prescriptionId, { query: db.query.bind(db) });
}

/**
 * Override tương kỵ — practitioner/admin, lý do bắt buộc.
 * Chỉ override được cặp đang tồn tại trong đơn hiện tại.
 */
export async function overrideInteraction(
  prescriptionId: string,
  interactionId: string,
  reason: string,
): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner");
  if (!reason?.trim()) return { error: "Vui lòng nhập lý do override." };

  // Verify interaction còn hiệu lực trong đơn hiện tại
  const safety = await evaluatePrescriptionSafety(prescriptionId, { query: db.query.bind(db) });
  const target = safety.interactions.find((x) => x.interaction_id === interactionId);
  if (!target) return { error: "Cặp tương kỵ không còn trong đơn hiện tại." };
  if (target.overridden) return { error: "Đã override cặp này rồi." };

  try {
    await db.query(
      `INSERT INTO prescription_interaction_overrides
         (prescription_id, interaction_id, reason, overridden_by)
       VALUES ($1, $2, $3, $4)`,
      [prescriptionId, interactionId, reason.trim(), user.id],
    );
  } catch (e) {
    console.error("[overrideInteraction] failed:", e);
    return { error: "Override thất bại." };
  }

  await audit({
    userId: user.id,
    action: "INTERACTION_OVERRIDE",
    tableName: "prescriptions",
    rowId: prescriptionId,
    newValue: { interaction_id: interactionId, reason: reason.trim() },
  });
  return {};
}

/**
 * Khi sửa đơn (thêm/xóa/sửa vị) → xóa toàn bộ override cũ.
 * Gọi trong cùng transaction với thao tác sửa đơn.
 */
export async function invalidateOverrides(
  prescriptionId: string,
  tx: { query: typeof db.query },
): Promise<void> {
  await tx.query(
    `DELETE FROM prescription_interaction_overrides WHERE prescription_id = $1`,
    [prescriptionId],
  );
}

export async function confirmPrescription(id: string): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner");

  try {
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

      // 1b. Kiểm tra an toàn lâm sàng (P0: re-check server-side trong transaction)
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
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY_PROCESSED") {
      return { error: "Đơn đã được xử lý trước đó, vui lòng tải lại." };
    }
    if (e instanceof Error && e.message.startsWith("BLOCKED_INTERACTION:")) {
      const names = e.message.replace("BLOCKED_INTERACTION:", "");
      return {
        error: `Đơn có cặp cấm kỵ chưa được duyệt: ${names}. Vui lòng xử lý trước khi chốt.`,
      };
    }
    console.error("[confirmPrescription] failed:", e);
    return { error: "Không chốt được đơn, vui lòng thử lại" };
  }

  await audit({
    userId: user.id,
    action: "CONFIRM_PRESCRIPTION",
    tableName: "prescriptions",
    rowId: id,
  });

  return {};
}

export interface FefoPreviewItem {
  herb_name: string;
  needed: number;
  available: number;
  shortage: number;
  lots: { lot_code: string; take: number; expiry_date: string | null }[];
}

/**
 * Preview FEFO cho dialog xác nhận bốc thuốc (read-only, không lock).
 */
export async function previewDispense(id: string): Promise<FefoPreviewItem[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows: rx } = await db.query<{ num_of_packs: number }>(
    `SELECT num_of_packs FROM prescriptions WHERE id = $1`,
    [id],
  );
  if (rx.length === 0) return [];
  const numPacks = Number(rx[0].num_of_packs) || 1;

  const { rows: items } = await db.query<{
    herb_id: string; herb_name: string; weight_per_pack: number;
  }>(
    `SELECT herb_id, herb_name, weight_per_pack FROM prescription_items
     WHERE prescription_id = $1 AND herb_id IS NOT NULL`,
    [id],
  );

  const out: FefoPreviewItem[] = [];
  for (const it of items) {
    const needed = Number(it.weight_per_pack) * numPacks;
    const { rows: lots } = await db.query<{
      lot_code: string; quantity_current: number; expiry_date: string | null;
    }>(
      `SELECT lot_code, quantity_current, expiry_date FROM stock_lots
       WHERE herb_id = $1 AND quantity_current > 0
         AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
       ORDER BY expiry_date NULLS LAST, created_at ASC, id ASC`,
      [it.herb_id],
    );
    let rest = needed;
    const take: FefoPreviewItem["lots"] = [];
    for (const l of lots) {
      if (rest <= 0) break;
      const t = Math.min(Number(l.quantity_current), rest);
      take.push({ lot_code: l.lot_code, take: t, expiry_date: l.expiry_date });
      rest -= t;
    }
    const available = needed - rest;
    out.push({
      herb_name: it.herb_name,
      needed,
      available,
      shortage: Math.max(0, rest),
      lots: take,
    });
  }
  return out;
}

/**
 * Bốc thuốc + trừ kho FEFO trong 1 transaction.
 * - Lock đơn trước, check status = confirmed (idempotent).
 * - Lock tất cả lot liên quan (FOR UPDATE) trước khi tính FEFO.
 * - Lô hết hạn không tham gia FEFO.
 * - Thiếu hàng → rollback toàn bộ.
 */
export async function completePrescription(id: string): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner", "dispenser");

  try {
    await withTransaction(async (tx) => {
      // 1. Lock đơn + check idempotent
      const { rows: rx } = await tx.query<{ num_of_packs: number }>(
        `SELECT num_of_packs FROM prescriptions WHERE id = $1 AND status = 'confirmed' FOR UPDATE`,
        [id],
      );
      if (rx.length === 0) throw new Error("NOT_CONFIRMED");
      const numPacks = Number(rx[0].num_of_packs) || 1;

      // 2. Lấy các dòng có herb_id
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

        // 4. Tính FEFO
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

        // 5. Trừ kho + ghi movement
        for (const p of plan) {
          await tx.query(
            `UPDATE stock_lots SET quantity_current = quantity_current - $1 WHERE id = $2`,
            [p.take, p.lotId],
          );
          await tx.query(
            `INSERT INTO stock_lot_movements (lot_id, quantity_change, reason, reference_type, reference_id, created_by)
             VALUES ($1, $2, 'Xuat thuoc', 'PRESCRIPTION', $3, $4)`,
            [p.lotId, -p.take, id, user.id],
          );
        }
      }

      // 6. Đơn → completed
      await tx.query(
        `UPDATE prescriptions
         SET status = 'completed', completed_by = $1, completed_at = NOW()
         WHERE id = $2`,
        [user.id, id],
      );
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_CONFIRMED") {
      return { error: "Chỉ đơn đã chốt mới bốc thuốc được." };
    }
    if (msg.startsWith("SHORTAGE:")) {
      const [, name, shortage] = msg.split(":");
      return { error: `Không đủ tồn kho: ${name} thiếu ${shortage}.` };
    }
    console.error("[completePrescription] failed:", e);
    return { error: "Bốc thuốc thất bại, vui lòng thử lại." };
  }

  await audit({
    userId: user.id,
    action: "COMPLETE_PRESCRIPTION",
    tableName: "prescriptions",
    rowId: id,
  });
  return {};
}

/**
 * Hủy đơn — atomic, chống race (theo review ChatGPT).
 * Phân quyền: admin/practitioner được hủy draft/confirmed;
 * dispenser KHÔNG được hủy (kể cả draft).
 */
export async function cancelPrescription(
  id: string,
  reason: string,
): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner", "dispenser");

  if (user.role === "dispenser") {
    return { error: "Nhân viên bốc thuốc không được hủy đơn." };
  }
  if (!reason?.trim()) {
    return { error: "Vui lòng nhập lý do hủy đơn." };
  }

  const { rowCount } = await db.query(
    `UPDATE prescriptions
     SET status = 'cancelled', cancelled_by = $1, cancelled_at = NOW(), cancel_reason = $2
     WHERE id = $3 AND status IN ('draft', 'confirmed')`,
    [user.id, reason.trim(), id],
  );
  if (rowCount === 0) {
    return { error: "Không thể hủy đơn ở trạng thái này." };
  }

  await audit({
    userId: user.id,
    action: "CANCEL_PRESCRIPTION",
    tableName: "prescriptions",
    rowId: id,
    newValue: { reason: reason.trim() },
  });
  return {};
}

export interface PrescriptionListRow {
  id: string;
  prescription_code: string;
  status: PrescriptionStatus;
  num_of_packs: number;
  created_at: string;
  patient_name: string;
  patient_code: string;
}

export async function getPrescriptionsByVisit(
  visitId: string,
): Promise<PrescriptionListRow[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<PrescriptionListRow>(
    `SELECT p.id, p.prescription_code, p.status, p.num_of_packs, p.created_at,
            pt.full_name AS patient_name, pt.patient_code
     FROM prescriptions p
     JOIN visits v ON v.id = p.visit_id
     JOIN patients pt ON pt.id = v.patient_id
     WHERE p.visit_id = $1
     ORDER BY p.created_at DESC`,
    [visitId],
  );
  return rows;
}

export interface PrescriptionDetail {
  id: string;
  prescription_code: string;
  status: PrescriptionStatus;
  num_of_packs: number;
  usage_instruction: string | null;
  doctor_notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  template_id: string | null;
  template_version: number | null;
  template_name: string | null;
  patient_id: string;
  patient_code: string;
  patient_name: string;
  practitioner_name: string;
  items: {
    herb_name: string;
    weight_per_pack: number;
    note: string | null;
  }[];
}

export async function getPrescription(id: string): Promise<PrescriptionDetail | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query(
    `SELECT p.id, p.prescription_code, p.status, p.num_of_packs,
            p.usage_instruction, p.doctor_notes, p.created_at, p.confirmed_at,
            p.template_id, p.template_version, t.name AS template_name,
            pt.id AS patient_id, pt.patient_code, pt.full_name AS patient_name,
            u.full_name AS practitioner_name
     FROM prescriptions p
     JOIN visits v ON v.id = p.visit_id
     JOIN patients pt ON pt.id = v.patient_id
     JOIN users u ON u.id = p.practitioner_id
     LEFT JOIN prescription_templates t ON t.id = p.template_id
     WHERE p.id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  const { rows: items } = await db.query(
    `SELECT herb_name, weight_per_pack, note FROM prescription_items
     WHERE prescription_id = $1 ORDER BY id`,
    [id],
  );
  return { ...rows[0], items } as PrescriptionDetail;
}

export interface SnapshotData {
  prescriptionCode: string;
  visitId: string;
  visitDate: string;
  patient: { id: string; code: string; name: string; dob: string | null; phone: string | null };
  practitioner: { id: string | null; name: string };
  confirmedBy: { id: string; name: string };
  confirmedAt: string;
  items: { herbName: string; weightPerPack: number; totalWeight: number; note: string | null }[];
  numOfPacks: number;
  totalWeightAll: number;
  usageInstruction: string | null;
  doctorNotes: string | null;
}

export async function getPrescriptionSnapshot(
  prescriptionId: string,
): Promise<SnapshotData | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<{ snapshot_data: SnapshotData }>(
    `SELECT snapshot_data FROM prescription_snapshots
     WHERE prescription_id = $1 ORDER BY version DESC LIMIT 1`,
    [prescriptionId],
  );
  return rows[0]?.snapshot_data ?? null;
}

/** Lấy bài thuốc mẫu (version mới nhất, active) để kê đơn */
export async function getActiveTemplatesForPrescription(): Promise<
  { id: string; code: string; version: number; name: string }[]
> {
  await requireRole("admin", "practitioner");
  const { rows } = await db.query<{ id: string; code: string; version: number; name: string }>(
    `SELECT DISTINCT ON (code) id, code, version, name
     FROM prescription_templates
     WHERE is_active = true
     ORDER BY code, version DESC`,
  );
  return rows;
}

export async function getTemplateItemsForPrescription(
  templateId: string,
): Promise<{ herb_name: string; dosage_text: string }[]> {
  await requireRole("admin", "practitioner");
  const { rows } = await db.query<{ herb_name: string; dosage_text: string }>(
    `SELECT herb_name, dosage_text FROM prescription_template_items
     WHERE template_id = $1 ORDER BY sort_order`,
    [templateId],
  );
  return rows;
}

/**
 * Tái khám: tạo lượt khám mới + đơn nháp copy từ đơn cũ (1 click).
 * Dùng cho bệnh nhân mãn tính bốc lại thang thuốc cũ có gia giảm.
 * Trả về ID đơn mới để chuyển tới trang sửa.
 */
export async function reprisePrescription(sourceId: string): Promise<{ newId?: string; error?: string }> {
  const user = await requireRole("admin", "practitioner");

  const src = await getPrescription(sourceId);
  if (!src) return { error: "Không tìm thấy đơn thuốc" };

  try {
    const newId = await withTransaction(async (tx) => {
      // 1. Lượt khám mới (tái khám)
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

      // 3. Copy vị thuốc
      for (const it of src.items) {
        await tx.query(
          `INSERT INTO prescription_items (prescription_id, herb_name, herb_name_key, weight_per_pack, note)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            newPresId,
            it.herb_name,
            normalizeHerbKey(it.herb_name as string),
            it.weight_per_pack,
            it.note ?? null,
          ],
        );
      }
      return newPresId;
    });

    await audit({
      userId: user.id,
      action: "REPRISE_PRESCRIPTION",
      tableName: "prescriptions",
      rowId: newId,
      newValue: { source_id: sourceId },
    });
    return { newId };
  } catch (e) {
    console.error("[reprisePrescription] failed:", e);
    return { error: "Không tạo được đơn bốc lại, vui lòng thử lại" };
  }
}

/* ==================== QUẢN LÝ TƯƠNG KỴ ==================== */

import type { InteractionCategory } from "./interactionConstants";

export interface InteractionRow {
  id: string;
  herb_a_id: string;
  herb_b_id: string;
  herb_a_name: string;
  herb_a_code: string;
  herb_b_name: string;
  herb_b_code: string;
  severity: "cam_ky" | "can_trong";
  category: InteractionCategory;
  contraindicated_for: string[];
  symptoms: string | null;
  antidote: string | null;
  description: string | null;
  source: string | null;
  verified: boolean;
  verified_by_name: string | null;
  verified_at: string | null;
  created_at: string;
}

export async function listInteractions(filter?: {
  q?: string;
  severity?: string;
  category?: string;
  verified?: string;
}): Promise<InteractionRow[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const conds: string[] = [];
  const params: unknown[] = [];
  if (filter?.q) {
    params.push(`%${filter.q}%`);
    conds.push(`(ha.name_common ILIKE $${params.length} OR hb.name_common ILIKE $${params.length})`);
  }
  if (filter?.severity) {
    params.push(filter.severity);
    conds.push(`ix.severity = $${params.length}`);
  }
  if (filter?.category) {
    params.push(filter.category);
    conds.push(`ix.category = $${params.length}`);
  }
  if (filter?.verified === "yes") conds.push(`ix.verified = TRUE`);
  if (filter?.verified === "no") conds.push(`ix.verified = FALSE`);
  const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";
  const { rows } = await db.query(
    `SELECT ix.id, ix.herb_a_id, ix.herb_b_id, ix.severity, ix.category,
            ix.contraindicated_for, ix.symptoms, ix.antidote,
            ix.description, ix.source,
            ix.verified, ix.verified_at, ix.created_at,
            ha.name_common AS herb_a_name, ha.code AS herb_a_code,
            hb.name_common AS herb_b_name, hb.code AS herb_b_code,
            u.full_name AS verified_by_name
     FROM herb_interactions ix
     JOIN herbs ha ON ha.id = ix.herb_a_id
     JOIN herbs hb ON hb.id = ix.herb_b_id
     LEFT JOIN users u ON u.id = ix.verified_by
     ${where}
     ORDER BY ix.verified ASC, ix.severity DESC, ix.created_at DESC`,
    params,
  );
  return rows as InteractionRow[];
}

export interface InteractionInput {
  herbAId: string;
  herbBId: string;
  severity: "cam_ky" | "can_trong";
  category: InteractionCategory;
  contraindicatedFor: string[];
  symptoms?: string;
  antidote?: string;
  description?: string;
  source?: string;
}

export async function createInteraction(
  input: InteractionInput,
): Promise<{ id?: string; error?: string }> {
  const user = await requireRole("admin", "practitioner");
  if (input.herbAId === input.herbBId) return { error: "Hai vị thuốc phải khác nhau." };
  const a = input.herbAId < input.herbBId ? input.herbAId : input.herbBId;
  const b = input.herbAId < input.herbBId ? input.herbBId : input.herbAId;
  try {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO herb_interactions
         (herb_a_id, herb_b_id, severity, category, contraindicated_for, symptoms, antidote,
          description, source, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [a, b, input.severity, input.category, input.contraindicatedFor,
       input.symptoms?.trim() || null, input.antidote?.trim() || null,
       input.description?.trim() || null, input.source?.trim() || null, user.id],
    );
    return { id: rows[0].id };
  } catch (e) {
    if (e instanceof Error && e.message.includes("uq_interaction_pair")) {
      return { error: "Cặp tương kỵ này đã tồn tại." };
    }
    console.error("[createInteraction] failed:", e);
    return { error: "Tạo thất bại." };
  }
}

export async function getInteraction(id: string): Promise<InteractionRow | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const rows = await listInteractions();
  return rows.find((r) => r.id === id) ?? null;
}

export async function updateInteraction(
  id: string,
  input: InteractionInput,
): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  if (input.herbAId === input.herbBId) return { error: "Hai vị thuốc phải khác nhau." };
  const a = input.herbAId < input.herbBId ? input.herbAId : input.herbBId;
  const b = input.herbAId < input.herbBId ? input.herbBId : input.herbAId;
  try {
    await db.query(
      `UPDATE herb_interactions SET
         herb_a_id = $1, herb_b_id = $2, severity = $3, category = $4,
         contraindicated_for = $5, symptoms = $6, antidote = $7,
         description = $8, source = $9,
         verified = FALSE, verified_by = NULL, verified_at = NULL
       WHERE id = $10`,
      [a, b, input.severity, input.category, input.contraindicatedFor,
       input.symptoms?.trim() || null, input.antidote?.trim() || null,
       input.description?.trim() || null, input.source?.trim() || null, id],
    );
  } catch (e) {
    if (e instanceof Error && e.message.includes("uq_interaction_pair")) {
      return { error: "Cặp tương kỵ này đã tồn tại." };
    }
    console.error("[updateInteraction] failed:", e);
    return { error: "Cập nhật thất bại." };
  }
  await audit({ userId: user.id, action: "INTERACTION_UPDATE", tableName: "herb_interactions", rowId: id });
  return {};
}

export async function verifyInteraction(id: string): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  const { rowCount } = await db.query(
    `UPDATE herb_interactions SET verified = TRUE, verified_by = $1, verified_at = NOW()
     WHERE id = $2 AND verified = FALSE`,
    [user.id, id],
  );
  if (rowCount === 0) return { error: "Không thể duyệt." };
  await audit({ userId: user.id, action: "INTERACTION_VERIFY", tableName: "herb_interactions", rowId: id });
  return {};
}

export async function unverifyInteraction(id: string): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  await db.query(
    `UPDATE herb_interactions SET verified = FALSE, verified_by = NULL, verified_at = NULL
     WHERE id = $1`,
    [id],
  );
  await audit({ userId: user.id, action: "INTERACTION_UNVERIFY", tableName: "herb_interactions", rowId: id });
  return {};
}

export async function deleteInteraction(id: string): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  const { rows } = await db.query<{ verified: boolean }>(
    `SELECT verified FROM herb_interactions WHERE id = $1`,
    [id],
  );
  if (rows.length === 0) return { error: "Không tìm thấy." };
  if (rows[0].verified && user.role !== "admin") {
    return { error: "Chỉ admin được xóa cặp đã kiểm duyệt." };
  }
  await db.query(`DELETE FROM herb_interactions WHERE id = $1`, [id]);
  await audit({ userId: user.id, action: "INTERACTION_DELETE", tableName: "herb_interactions", rowId: id });
  return {};
}

/* ==================== GIỚI HẠN LIỀU ==================== */

export async function getDosageLimit(herbId: string): Promise<{
  max_daily_dose: number | null; source: string | null; verified: boolean;
} | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<{
    max_daily_dose: number | null; source: string | null; verified: boolean;
  }>(
    `SELECT max_daily_dose, source, verified FROM herb_dosage_limits WHERE herb_id = $1`,
    [herbId],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function setDosageLimit(
  herbId: string,
  maxDailyDose: number | null,
  source?: string,
): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  if (maxDailyDose !== null && maxDailyDose <= 0) return { error: "Liều phải dương." };
  await db.query(
    `INSERT INTO herb_dosage_limits (herb_id, max_daily_dose, source, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (herb_id) DO UPDATE SET
       max_daily_dose = EXCLUDED.max_daily_dose,
       source = EXCLUDED.source,
       verified = FALSE, verified_by = NULL, verified_at = NULL`,
    [herbId, maxDailyDose, source?.trim() || null, user.id],
  );
  return {};
}

export async function verifyDosageLimit(herbId: string): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  await db.query(
    `UPDATE herb_dosage_limits SET verified = TRUE, verified_by = $1, verified_at = NOW()
     WHERE herb_id = $2`,
    [user.id, herbId],
  );
  return {};
}
