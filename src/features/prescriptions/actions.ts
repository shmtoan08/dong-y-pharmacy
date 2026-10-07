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

/** Dispenser/admin/practitioner đánh dấu đã bốc thuốc (chỉ từ confirmed) */
export async function completePrescription(id: string): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner", "dispenser");

  const { rowCount } = await db.query(
    `UPDATE prescriptions
     SET status = 'completed', completed_by = $1, completed_at = NOW()
     WHERE id = $2 AND status = 'confirmed'`,
    [user.id, id],
  );
  if (rowCount === 0) {
    return { error: "Chỉ đơn đã chốt mới đánh dấu bốc thuốc được." };
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
