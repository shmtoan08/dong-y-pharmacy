"use server";

import { redirect } from "next/navigation";
import { withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { visitSchema } from "./schemas";

import type { ActionState } from "@/types/action-state";
export type { ActionState };

import {
  getPulsePatterns as getPulsePatternsQuery,
  getVisitsByPatient as getVisitsByPatientQuery,
  getVisitDetail as getVisitDetailQuery,
  type PulsePattern,
  type VisitRow,
  type VisitDetail,
} from "./queries";

export type { PulsePattern, VisitRow, VisitDetail };

export async function getPulsePatterns(): Promise<PulsePattern[]> {
  return getPulsePatternsQuery();
}

interface PulseInput {
  hand: string;
  position: string;
  pulse_pattern_id: string | null;
  pulse_pattern_id_2?: string | null;
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
    bat_cuong: formData.get("bat_cuong") || undefined,
    doctor_notes: formData.get("doctor_notes") || undefined,
    pulses: pulses ?? [],
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const d = parsed.data;

  // Chỉ lưu các vị trí có chọn mạch hoặc có ghi chú
  const filled = d.pulses.filter((p) => p.pulse_pattern_id || p.pulse_pattern_id_2 || p.custom_note?.trim());

  let visitId: string;
  try {
    visitId = await withTransaction(async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO visits
           (patient_id, practitioner_id, inspection_notes, auscultation_notes,
            inquiry_notes, palpation_notes, final_diagnosis, bat_cuong, doctor_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          d.patient_id,
          user.id,
          d.inspection_notes?.trim() || null,
          d.auscultation_notes?.trim() || null,
          d.inquiry_notes?.trim() || null,
          d.palpation_notes?.trim() || null,
          d.final_diagnosis?.trim() || null,
          d.bat_cuong?.trim() || null,
          d.doctor_notes?.trim() || null,
        ],
      );
      const vid = rows[0].id;
      for (const p of filled) {
        await tx.query(
          `INSERT INTO visit_pulses (visit_id, hand, position, pulse_pattern_id, pulse_pattern_id_2, custom_note)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [vid, p.hand, p.position, p.pulse_pattern_id, p.pulse_pattern_id_2 || null, p.custom_note?.trim() || null],
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

export async function getVisitsByPatient(patientId: string): Promise<VisitRow[]> {
  return getVisitsByPatientQuery(patientId);
}

/** Chi tiết đầy đủ 1 lượt khám (Tứ chẩn + Mạch) */
export async function getVisitDetail(visitId: string): Promise<VisitDetail | null> {
  return getVisitDetailQuery(visitId);
}
