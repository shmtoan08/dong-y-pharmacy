"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export interface ActionState {
  error?: string;
}

async function requirePractitioner() {
  return requireRole("admin", "practitioner");
}

export interface ClinicalCaseInput {
  disease_name: string;
  pattern?: string | null;
  treatment_principle?: string | null;
  symptoms?: string | null;
  template_id?: string | null;
  usage_instruction?: string | null;
  outcome?: string | null;
  discussion?: string | null;
  source?: string | null;
}

export async function createClinicalCase(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePractitioner();
  const disease_name = String(formData.get("disease_name") ?? "").trim();
  if (!disease_name) return { error: "Vui lòng nhập bệnh danh" };

  const input: ClinicalCaseInput = {
    disease_name,
    pattern: String(formData.get("pattern") ?? "").trim() || null,
    treatment_principle: String(formData.get("treatment_principle") ?? "").trim() || null,
    symptoms: String(formData.get("symptoms") ?? "").trim() || null,
    template_id: String(formData.get("template_id") ?? "").trim() || null,
    usage_instruction: String(formData.get("usage_instruction") ?? "").trim() || null,
    outcome: String(formData.get("outcome") ?? "").trim() || null,
    discussion: String(formData.get("discussion") ?? "").trim() || null,
    source: String(formData.get("source") ?? "").trim() || null,
  };

  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO clinical_cases
       (disease_name, pattern, treatment_principle, symptoms, template_id,
        usage_instruction, outcome, discussion, source, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      input.disease_name,
      input.pattern,
      input.treatment_principle,
      input.symptoms,
      input.template_id,
      input.usage_instruction,
      input.outcome,
      input.discussion,
      input.source,
      user.id,
    ],
  );
  await audit({
    userId: user.id,
    action: "CREATE_CLINICAL_CASE",
    tableName: "clinical_cases",
    rowId: rows[0].id,
    newValue: { disease_name: input.disease_name },
  });
  redirect(`/clinical-cases/${rows[0].id}`);
}

export async function updateClinicalCase(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePractitioner();
  const disease_name = String(formData.get("disease_name") ?? "").trim();
  if (!disease_name) return { error: "Vui lòng nhập bệnh danh" };

  const input: ClinicalCaseInput = {
    disease_name,
    pattern: String(formData.get("pattern") ?? "").trim() || null,
    treatment_principle: String(formData.get("treatment_principle") ?? "").trim() || null,
    symptoms: String(formData.get("symptoms") ?? "").trim() || null,
    template_id: String(formData.get("template_id") ?? "").trim() || null,
    usage_instruction: String(formData.get("usage_instruction") ?? "").trim() || null,
    outcome: String(formData.get("outcome") ?? "").trim() || null,
    discussion: String(formData.get("discussion") ?? "").trim() || null,
    source: String(formData.get("source") ?? "").trim() || null,
  };

  await db.query(
    `UPDATE clinical_cases SET
       disease_name = $1, pattern = $2, treatment_principle = $3,
       symptoms = $4, template_id = $5, usage_instruction = $6,
       outcome = $7, discussion = $8, source = $9, updated_at = NOW()
     WHERE id = $10`,
    [
      input.disease_name,
      input.pattern,
      input.treatment_principle,
      input.symptoms,
      input.template_id,
      input.usage_instruction,
      input.outcome,
      input.discussion,
      input.source,
      id,
    ],
  );
  await audit({
    userId: user.id,
    action: "UPDATE_CLINICAL_CASE",
    tableName: "clinical_cases",
    rowId: id,
    newValue: { disease_name: input.disease_name },
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
