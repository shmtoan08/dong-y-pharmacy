"use server";

import { redirect } from "next/navigation";
import { db, withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { visitSchema } from "./schemas";

export interface ActionState {
  error?: string;
}

export interface PulsePattern {
  id: string;
  name_viet: string;
  name_han_viet: string;
  description: string;
}

export async function getPulsePatterns(): Promise<PulsePattern[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<PulsePattern>(
    `SELECT id, name_viet, name_han_viet, description
     FROM pulse_patterns ORDER BY name_viet`,
  );
  return rows;
}

interface PulseInput {
  hand: string;
  position: string;
  pulse_pattern_id: string | null;
  custom_note?: string;
}

function parsePulses(formData: FormData): PulseInput[] | null {
  const raw = formData.get("pulses");
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function createVisit(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner");

  const pulses = parsePulses(formData);
  const parsed = visitSchema.safeParse({
    patient_id: formData.get("patient_id"),
    inspection_notes: formData.get("inspection_notes") || undefined,
    auscultation_notes: formData.get("auscultation_notes") || undefined,
    inquiry_notes: formData.get("inquiry_notes") || undefined,
    palpation_notes: formData.get("palpation_notes") || undefined,
    final_diagnosis: formData.get("final_diagnosis") || undefined,
    doctor_notes: formData.get("doctor_notes") || undefined,
    pulses: pulses ?? [],
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const d = parsed.data;

  // Chỉ lưu các vị trí có chọn mạch hoặc có ghi chú
  const filled = d.pulses.filter((p) => p.pulse_pattern_id || p.custom_note?.trim());

  let visitId: string;
  try {
    visitId = await withTransaction(async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO visits
           (patient_id, practitioner_id, inspection_notes, auscultation_notes,
            inquiry_notes, palpation_notes, final_diagnosis, doctor_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          d.patient_id,
          user.id,
          d.inspection_notes?.trim() || null,
          d.auscultation_notes?.trim() || null,
          d.inquiry_notes?.trim() || null,
          d.palpation_notes?.trim() || null,
          d.final_diagnosis?.trim() || null,
          d.doctor_notes?.trim() || null,
        ],
      );
      const vid = rows[0].id;
      for (const p of filled) {
        await tx.query(
          `INSERT INTO visit_pulses (visit_id, hand, position, pulse_pattern_id, custom_note)
           VALUES ($1, $2, $3, $4, $5)`,
          [vid, p.hand, p.position, p.pulse_pattern_id, p.custom_note?.trim() || null],
        );
      }
      return vid;
    });
  } catch (e) {
    console.error("[createVisit] transaction failed:", e);
    return { error: "Không lưu được lượt khám, vui lòng thử lại" };
  }

  await audit({
    userId: user.id,
    action: "CREATE_VISIT",
    tableName: "visits",
    rowId: visitId,
    newValue: { patient_id: d.patient_id },
  });

  // Luu & Ke don ngay -> chuyen sang trang ke don cho luot kham vua tao
  const next = formData.get("next_action");
  if (next === "prescribe") {
    redirect(`/prescriptions/new?visitId=${visitId}`);
  }
  redirect(`/patients/${d.patient_id}`);
}

export interface VisitRow {
  id: string;
  patient_id: string;
  visited_at: string;
  final_diagnosis: string | null;
  practitioner_name: string;
}

export async function getVisitsByPatient(patientId: string): Promise<VisitRow[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<VisitRow>(
    `SELECT v.id, v.patient_id, v.visited_at, v.final_diagnosis, u.full_name AS practitioner_name
     FROM visits v
     JOIN users u ON u.id = v.practitioner_id
     WHERE v.patient_id = $1
     ORDER BY v.visited_at DESC`,
    [patientId],
  );
  return rows;
}

export interface VisitDetail {
  id: string;
  visited_at: string;
  inspection_notes: string | null;
  auscultation_notes: string | null;
  inquiry_notes: string | null;
  palpation_notes: string | null;
  final_diagnosis: string | null;
  doctor_notes: string | null;
  practitioner_name: string;
  pulses: {
    hand: string;
    position: string;
    pattern_name: string | null;
    custom_note: string | null;
  }[];
}

/** Chi tiết đầy đủ 1 lượt khám (Tứ chẩn + Mạch) */
export async function getVisitDetail(visitId: string): Promise<VisitDetail | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query(
    `SELECT v.id, v.visited_at, v.inspection_notes, v.auscultation_notes,
            v.inquiry_notes, v.palpation_notes, v.final_diagnosis, v.doctor_notes,
            u.full_name AS practitioner_name
     FROM visits v
     JOIN users u ON u.id = v.practitioner_id
     WHERE v.id = $1`,
    [visitId],
  );
  if (rows.length === 0) return null;
  const pulses = await db.query(
    `SELECT vp.hand, vp.position, pp.name_viet AS pattern_name, vp.custom_note
     FROM visit_pulses vp
     LEFT JOIN pulse_patterns pp ON pp.id = vp.pulse_pattern_id
     WHERE vp.visit_id = $1
     ORDER BY vp.hand, vp.position`,
    [visitId],
  );
  return { ...rows[0], pulses: pulses.rows } as VisitDetail;
}
