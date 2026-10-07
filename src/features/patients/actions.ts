"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { patientSchema, type PatientInput } from "./schemas";

export interface ActionState {
  error?: string;
}

async function requireClinician() {
  // Admin + thầy thuốc được quản lý BN; nhân viên bốc thuốc chỉ xem
  return requireRole("admin", "practitioner");
}

/** Sinh mã BN-YYYYMMDD-XXX, atomic qua next_daily_n() */
async function nextPatientCode(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const { rows } = await db.query<{ next_daily_n: number }>(
    `SELECT next_daily_n($1, 'patient')`,
    [today],
  );
  const n = rows[0].next_daily_n;
  const ymd = today.replace(/-/g, "");
  return `BN-${ymd}-${String(n).padStart(3, "0")}`;
}

export interface PatientRow {
  id: string;
  patient_code: string;
  full_name: string;
  date_of_birth: string | null;
  sex: string | null;
  phone: string | null;
  address: string | null;
  medical_history: string | null;
  allergies: string | null;
  created_at: string;
}

export async function createPatient(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireClinician();

  const parsed = patientSchema.safeParse({
    full_name: formData.get("full_name"),
    date_of_birth: formData.get("date_of_birth") || undefined,
    sex: formData.get("sex") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    medical_history: formData.get("medical_history") || undefined,
    allergies: formData.get("allergies") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const d: PatientInput = parsed.data;
  const code = await nextPatientCode();

  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO patients
       (patient_code, full_name, date_of_birth, sex, phone, address, medical_history, allergies)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      code,
      d.full_name.trim(),
      d.date_of_birth || null,
      d.sex || null,
      d.phone?.trim() || null,
      d.address?.trim() || null,
      d.medical_history?.trim() || null,
      d.allergies?.trim() || null,
    ],
  );

  await audit({
    userId: user.id,
    action: "CREATE_PATIENT",
    tableName: "patients",
    rowId: rows[0].id,
    newValue: { code, name: d.full_name },
  });

  redirect(`/patients/${rows[0].id}`);
}

export async function updatePatient(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireClinician();

  const parsed = patientSchema.safeParse({
    full_name: formData.get("full_name"),
    date_of_birth: formData.get("date_of_birth") || undefined,
    sex: formData.get("sex") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    medical_history: formData.get("medical_history") || undefined,
    allergies: formData.get("allergies") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const d: PatientInput = parsed.data;
  const { rowCount } = await db.query(
    `UPDATE patients SET
       full_name = $1, date_of_birth = $2, sex = $3, phone = $4,
       address = $5, medical_history = $6, allergies = $7, updated_at = NOW()
     WHERE id = $8`,
    [
      d.full_name.trim(),
      d.date_of_birth || null,
      d.sex || null,
      d.phone?.trim() || null,
      d.address?.trim() || null,
      d.medical_history?.trim() || null,
      d.allergies?.trim() || null,
      id,
    ],
  );
  if (rowCount === 0) return { error: "Không tìm thấy bệnh nhân" };

  await audit({
    userId: user.id,
    action: "UPDATE_PATIENT",
    tableName: "patients",
    rowId: id,
    newValue: { name: d.full_name },
  });

  redirect(`/patients/${id}`);
}

export async function searchPatients(q: string): Promise<PatientRow[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const like = `%${q.trim()}%`;
  const { rows } = await db.query<PatientRow>(
    `SELECT id, patient_code, full_name, date_of_birth, sex, phone,
            address, medical_history, allergies, created_at
     FROM patients
     WHERE full_name ILIKE $1 OR phone ILIKE $1 OR patient_code ILIKE $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [like],
  );
  return rows;
}

export async function getPatient(id: string): Promise<PatientRow | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<PatientRow>(
    `SELECT id, patient_code, full_name, date_of_birth, sex, phone,
            address, medical_history, allergies, created_at
     FROM patients WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
