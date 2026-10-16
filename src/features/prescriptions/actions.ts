"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prescriptionDraftSchema } from "./schemas";
import {
  createPrescriptionDraftTx,
  confirmPrescriptionTx,
  completePrescriptionTx,
  reprisePrescriptionTx,
} from "./service";
import {
  getPrescription as getPrescriptionQuery,
  getPrescriptionSnapshot as getPrescriptionSnapshotQuery,
  getPrescriptionsByVisit as getPrescriptionsByVisitQuery,
  getActiveTemplatesForPrescription as getActiveTemplatesQuery,
  getTemplateItemsForPrescription as getTemplateItemsQuery,
  previewDispense as previewDispenseQuery,
  evaluatePrescriptionSafety as evaluatePrescriptionSafetyQuery,
  checkPrescriptionSafety as checkPrescriptionSafetyQuery,
  listInteractions as listInteractionsQuery,
  getInteraction as getInteractionQuery,
  getDosageLimit as getDosageLimitQuery,
} from "./queries";
import type {
  ActionState,
  ItemInput,
  SafetyInteraction,
  SafetyDosageWarning,
  SafetyResult,
  FefoPreviewItem,
  PrescriptionListRow,
  PrescriptionDetail,
  SnapshotData,
  InteractionRow,
  InteractionInput,
} from "./types";

export type {
  ActionState,
  SafetyInteraction,
  SafetyDosageWarning,
  SafetyResult,
  FefoPreviewItem,
  PrescriptionListRow,
  PrescriptionDetail,
  SnapshotData,
  InteractionRow,
  InteractionInput,
};

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

/**
 * Server Action: Tạo đơn thuốc nháp
 */
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

  let prescriptionId: string;
  let code: string;
  try {
    const result = await createPrescriptionDraftTx(user, parsed.data);
    prescriptionId = result.prescriptionId;
    code = result.code;
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
 * Server Action: Chốt đơn thuốc (draft -> confirmed + snapshot)
 */
export async function confirmPrescription(id: string): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner");

  try {
    await confirmPrescriptionTx(user, id);
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

/**
 * Server Action: Bốc thuốc + trừ kho FEFO
 */
export async function completePrescription(id: string): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner", "dispenser");

  try {
    await completePrescriptionTx(user, id);
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
 * Server Action: Hủy đơn thuốc
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

/**
 * Server Action: Tái khám (bốc lại đơn cũ)
 */
export async function reprisePrescription(
  sourceId: string,
): Promise<{ newId?: string; error?: string }> {
  const user = await requireRole("admin", "practitioner");

  try {
    const newId = await reprisePrescriptionTx(user, sourceId);
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

/**
 * Server Action: Override tương kỵ lâm sàng
 */
export async function overrideInteraction(
  prescriptionId: string,
  interactionId: string,
  reason: string,
): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner");
  if (!reason?.trim()) return { error: "Vui lòng nhập lý do override." };

  const safety = await evaluatePrescriptionSafetyQuery(prescriptionId, { query: db.query.bind(db) });
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
 * Xóa toàn bộ override khi sửa đơn
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

/* ==================== QUẢN LÝ TƯƠNG KỴ ==================== */

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

/* ==================== RPC DELEGATES CHO CLIENT COMPONENTS ==================== */

export async function previewDispense(id: string): Promise<FefoPreviewItem[]> {
  return previewDispenseQuery(id);
}

export async function checkPrescriptionSafety(
  prescriptionId: string,
): Promise<SafetyResult> {
  return checkPrescriptionSafetyQuery(prescriptionId);
}

export async function evaluatePrescriptionSafety(
  prescriptionId: string,
  tx: { query: typeof db.query },
): Promise<SafetyResult> {
  return evaluatePrescriptionSafetyQuery(prescriptionId, tx);
}

export async function getActiveTemplatesForPrescription(): Promise<
  { id: string; code: string; version: number; name: string }[]
> {
  return getActiveTemplatesQuery();
}

export async function getTemplateItemsForPrescription(
  templateId: string,
): Promise<{ herb_name: string; dosage_text: string }[]> {
  return getTemplateItemsQuery(templateId);
}

export async function getPrescription(id: string): Promise<PrescriptionDetail | null> {
  return getPrescriptionQuery(id);
}

export async function getPrescriptionSnapshot(
  prescriptionId: string,
): Promise<SnapshotData | null> {
  return getPrescriptionSnapshotQuery(prescriptionId);
}

export async function getPrescriptionsByVisit(
  visitId: string,
): Promise<PrescriptionListRow[]> {
  return getPrescriptionsByVisitQuery(visitId);
}

export async function listInteractions(filter?: {
  q?: string;
  severity?: string;
  category?: string;
  verified?: string;
}): Promise<InteractionRow[]> {
  return listInteractionsQuery(filter);
}

export async function getInteraction(id: string): Promise<InteractionRow | null> {
  return getInteractionQuery(id);
}

export async function getDosageLimit(herbId: string): Promise<{
  max_daily_dose: number | null; source: string | null; verified: boolean;
} | null> {
  return getDosageLimitQuery(herbId);
}
