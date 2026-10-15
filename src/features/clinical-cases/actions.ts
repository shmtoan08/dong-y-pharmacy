"use server";

import { redirect } from "next/navigation";
import { db, withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export interface ActionState {
  error?: string;
}

async function requirePractitioner() {
  return requireRole("admin", "practitioner");
}

export interface PatternInput {
  pattern: string;
  treatment_principle?: string | null;
  symptoms?: string | null;
  template_id?: string | null;
  usage_instruction?: string | null;
  outcome?: string | null;
  discussion?: string | null;
  source?: string | null;
}

function parsePatterns(formData: FormData): PatternInput[] | null {
  const raw = formData.get("patterns");
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Tạo bệnh danh (mới hoặc dùng sẵn) + nhiều biện chứng cùng lúc.
 * Mỗi biện chứng có đầy đủ data riêng: pháp trị, triệu chứng, bài thuốc, cách dùng, hiệu quả, bàn luận.
 */
export async function createDiseaseWithCases(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePractitioner();
  const diseaseName = String(formData.get("disease_name") ?? "").trim();
  const diseaseDescription = String(formData.get("disease_description") ?? "").trim() || null;
  const existingDiseaseId = String(formData.get("existing_disease_id") ?? "").trim() || null;
  const patterns = parsePatterns(formData);

  if (!diseaseName && !existingDiseaseId) {
    return { error: "Vui lòng nhập tên bệnh hoặc chọn bệnh đã có" };
  }
  if (!patterns) return { error: "Vui lòng thêm ít nhất 1 biện chứng" };
  for (const p of patterns) {
    if (!p.pattern?.trim()) return { error: "Mỗi biện chứng cần có tên biện chứng" };
  }

  let diseaseId = existingDiseaseId;

  await withTransaction(async (tx) => {
    // Tạo bệnh mới nếu chưa chọn bệnh sẵn có
    if (!diseaseId) {
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO diseases (name, description, created_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET description = COALESCE(EXCLUDED.description, diseases.description)
         RETURNING id`,
        [diseaseName, diseaseDescription, user.id],
      );
      diseaseId = rows[0].id;
    }

    // Tạo từng biện chứng
    for (const p of patterns) {
      await tx.query(
        `INSERT INTO clinical_cases
           (disease_id, pattern, treatment_principle, symptoms, template_id,
            usage_instruction, outcome, discussion, source, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          diseaseId,
          p.pattern.trim(),
          p.treatment_principle?.trim() || null,
          p.symptoms?.trim() || null,
          p.template_id?.trim() || null,
          p.usage_instruction?.trim() || null,
          p.outcome?.trim() || null,
          p.discussion?.trim() || null,
          p.source?.trim() || null,
          user.id,
        ],
      );
    }
  });

  await audit({
    userId: user.id,
    action: "CREATE_DISEASE_WITH_CASES",
    tableName: "diseases",
    rowId: diseaseId!,
    newValue: { disease_name: diseaseName, pattern_count: patterns.length },
  });

  redirect(`/clinical-cases?disease=${diseaseId}`);
}

/** Tạo 1 biện chứng mới cho bệnh đã có (từ trang chi tiết bệnh) */
export async function createClinicalCase(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePractitioner();
  const diseaseId = String(formData.get("disease_id") ?? "").trim();
  const pattern = String(formData.get("pattern") ?? "").trim();
  if (!diseaseId) return { error: "Thiếu bệnh danh" };
  if (!pattern) return { error: "Vui lòng nhập biện chứng" };

  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO clinical_cases
       (disease_id, pattern, treatment_principle, symptoms, template_id,
        usage_instruction, outcome, discussion, source, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      diseaseId,
      pattern,
      String(formData.get("treatment_principle") ?? "").trim() || null,
      String(formData.get("symptoms") ?? "").trim() || null,
      String(formData.get("template_id") ?? "").trim() || null,
      String(formData.get("usage_instruction") ?? "").trim() || null,
      String(formData.get("outcome") ?? "").trim() || null,
      String(formData.get("discussion") ?? "").trim() || null,
      String(formData.get("source") ?? "").trim() || null,
      user.id,
    ],
  );
  await audit({
    userId: user.id,
    action: "CREATE_CLINICAL_CASE",
    tableName: "clinical_cases",
    rowId: rows[0].id,
    newValue: { pattern },
  });
  redirect(`/clinical-cases/${rows[0].id}`);
}

export async function updateClinicalCase(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePractitioner();
  const pattern = String(formData.get("pattern") ?? "").trim();
  if (!pattern) return { error: "Vui lòng nhập biện chứng" };

  await db.query(
    `UPDATE clinical_cases SET
       pattern = $1, treatment_principle = $2, symptoms = $3,
       template_id = $4, usage_instruction = $5,
       outcome = $6, discussion = $7, source = $8, updated_at = NOW()
     WHERE id = $9`,
    [
      pattern,
      String(formData.get("treatment_principle") ?? "").trim() || null,
      String(formData.get("symptoms") ?? "").trim() || null,
      String(formData.get("template_id") ?? "").trim() || null,
      String(formData.get("usage_instruction") ?? "").trim() || null,
      String(formData.get("outcome") ?? "").trim() || null,
      String(formData.get("discussion") ?? "").trim() || null,
      String(formData.get("source") ?? "").trim() || null,
      id,
    ],
  );
  await audit({
    userId: user.id,
    action: "UPDATE_CLINICAL_CASE",
    tableName: "clinical_cases",
    rowId: id,
    newValue: { pattern },
  });
  redirect(`/clinical-cases/${id}`);
}

export async function toggleClinicalCaseActive(id: string, isActive: boolean) {
  const user = await requirePractitioner();
  await db.query(`UPDATE clinical_cases SET is_active = $1, updated_at = NOW() WHERE id = $2`, [
    isActive,
    id,
  ]);
  await audit({
    userId: user.id,
    action: "TOGGLE_CLINICAL_CASE",
    tableName: "clinical_cases",
    rowId: id,
    newValue: { is_active: isActive },
  });
}
