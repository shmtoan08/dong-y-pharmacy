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

export interface SymptomOption {
  id: string;
  name: string;
  category: string;
}

export interface PatternInput {
  pattern: string;
  treatment_principle?: string | null;
  symptoms?: string | null;
  symptom_ids?: string[] | null;
  template_id?: string | null;
  usage_instruction?: string | null;
  outcome?: string | null;
  discussion?: string | null;
  source?: string | null;
}

async function linkSymptoms(
  tx: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  caseId: string,
  symptomIds: string[] | null | undefined,
) {
  if (!symptomIds || symptomIds.length === 0) return;
  for (const sid of symptomIds) {
    await tx.query(
      `INSERT INTO clinical_case_symptoms (case_id, symptom_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [caseId, sid],
    );
  }
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
      const { rows: caseRows } = await tx.query<{ id: string }>(
        `INSERT INTO clinical_cases
           (disease_id, pattern, treatment_principle, symptoms, template_id,
            usage_instruction, outcome, discussion, source, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
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
      await linkSymptoms(tx, caseRows[0].id, p.symptom_ids);
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

  let symptomIds: string[] = [];
  try {
    const raw = String(formData.get("symptom_ids") ?? "");
    if (raw) symptomIds = JSON.parse(raw);
  } catch { /* bỏ qua */ }

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
  await linkSymptoms(db, rows[0].id, symptomIds);
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

  let symptomIds: string[] = [];
  try {
    const raw = String(formData.get("symptom_ids") ?? "");
    if (raw) symptomIds = JSON.parse(raw);
  } catch { /* bỏ qua */ }

  await withTransaction(async (tx) => {
    await tx.query(
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
    await tx.query(`DELETE FROM clinical_case_symptoms WHERE case_id = $1`, [id]);
    await linkSymptoms(tx, id, symptomIds);
  });
  await audit({
    userId: user.id,
    action: "UPDATE_CLINICAL_CASE",
    tableName: "clinical_cases",
    rowId: id,
    newValue: { pattern },
  });
  redirect(`/clinical-cases/${id}`);
}

/** Xóa 1 biện chứng (hard delete). Bệnh danh không bị xóa. */
export async function deleteClinicalCase(id: string): Promise<void> {
  const user = await requirePractitioner();
  const { rows } = await db.query(
    `SELECT pattern, disease_id FROM clinical_cases WHERE id = $1`,
    [id],
  );
  if (rows.length === 0) throw new Error("Không tìm thấy biện chứng");
  await db.query(`DELETE FROM clinical_cases WHERE id = $1`, [id]);
  await audit({
    userId: user.id,
    action: "DELETE_CLINICAL_CASE",
    tableName: "clinical_cases",
    rowId: id,
    oldValue: { pattern: rows[0].pattern, disease_id: rows[0].disease_id },
  });
}

export async function getAllSymptoms(): Promise<SymptomOption[]> {
  await requirePractitioner();
  const { rows } = await db.query<SymptomOption>(
    `SELECT id, name, category FROM symptoms WHERE is_active = true ORDER BY category, name`,
  );
  return rows;
}

export interface DiagnosisResult {
  id: string;
  disease_name: string;
  pattern: string;
  treatment_principle: string | null;
  template_id: string | null;
  template_name: string | null;
  matched: number;
  total: number;
  matched_symptoms: string[];
}

/** Chẩn đoán: chấm điểm bệnh án theo số tag triệu chứng khớp, xếp hạng giảm dần */
export async function diagnoseCases(symptomIds: string[]): Promise<DiagnosisResult[]> {
  await requirePractitioner();
  if (symptomIds.length === 0) return [];
  const { rows } = await db.query<DiagnosisResult>(
    `SELECT c.id, d.name AS disease_name, c.pattern, c.treatment_principle,
       c.template_id, t.name AS template_name,
       COUNT(cs.symptom_id) FILTER (WHERE cs.symptom_id = ANY($1::uuid[])) AS matched,
       COUNT(cs.symptom_id) AS total,
       COALESCE(array_agg(s.name) FILTER (WHERE cs.symptom_id = ANY($1::uuid[])), '{}') AS matched_symptoms
     FROM clinical_cases c
     JOIN diseases d ON d.id = c.disease_id
     LEFT JOIN prescription_templates t ON t.id = c.template_id
     LEFT JOIN clinical_case_symptoms cs ON cs.case_id = c.id
     LEFT JOIN symptoms s ON s.id = cs.symptom_id
     WHERE c.is_active = true
     GROUP BY c.id, d.name, c.pattern, c.treatment_principle, c.template_id, t.name
     HAVING COUNT(cs.symptom_id) FILTER (WHERE cs.symptom_id = ANY($1::uuid[])) > 0
     ORDER BY matched DESC, (COUNT(cs.symptom_id) FILTER (WHERE cs.symptom_id = ANY($1::uuid[])))::float / NULLIF(COUNT(cs.symptom_id), 0) DESC
     LIMIT 20`,
    [symptomIds],
  );
  return rows.map((r) => ({
    ...r,
    matched: Number(r.matched),
    total: Number(r.total),
  }));
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
