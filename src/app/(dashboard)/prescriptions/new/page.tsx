import {
  getActiveTemplatesForPrescription,
  getTemplateItemsForPrescription,
} from "@/features/prescriptions/actions";
import { db } from "@/lib/db";
import { PrescriptionBuilder } from "@/components/prescriptions/PrescriptionBuilder";
import { VisitSummaryCard } from "@/components/prescriptions/VisitSummaryCard";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/shared/BackButton";

export default async function NewPrescriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ visitId?: string; templateId?: string }>;
}) {
  const { visitId, templateId } = await searchParams;
  if (!visitId) notFound();

  // Lấy thông tin visit + bệnh nhân + tóm tắt mạch
  const { rows: vr } = await db.query(
    `SELECT v.id, v.visited_at, v.final_diagnosis, v.doctor_notes,
            pt.id AS patient_id, pt.full_name, pt.patient_code, pt.sex,
            pt.date_of_birth, pt.allergies, pt.medical_history
     FROM visits v JOIN patients pt ON pt.id = v.patient_id
     WHERE v.id = $1`,
    [visitId],
  );
  if (vr.length === 0) notFound();
  const v = vr[0];

  const { rows: pulses } = await db.query<{ name_viet: string }>(
    `SELECT pp.name_viet
     FROM visit_pulses vp JOIN pulse_patterns pp ON pp.id = vp.pulse_pattern_id
     WHERE vp.visit_id = $1
     ORDER BY vp.hand, vp.position
     LIMIT 6`,
    [visitId],
  );

  const templates = await getActiveTemplatesForPrescription();
  const initialItems = templateId
    ? await getTemplateItemsForPrescription(templateId)
    : undefined;

  return (
    <div className="space-y-4">
      <BackButton href={`/patients/${v.patient_id}`} />
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Kê đơn mới</h1>
        <p className="text-sm text-stone-500">
          {v.full_name} · {v.patient_code}
        </p>
      </div>
      {/* 2 cột trên desktop: trái 60% đơn thuốc, phải 40% thông tin khám */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:items-start">
        <PrescriptionBuilder
          visitId={visitId}
          templates={templates}
          initialTemplateId={templateId}
          initialItems={initialItems}
        />
        <VisitSummaryCard
          visit={{
            full_name: v.full_name,
            patient_code: v.patient_code,
            sex: v.sex,
            date_of_birth: v.date_of_birth,
            allergies: v.allergies,
            medical_history: v.medical_history,
            visited_at: v.visited_at,
            final_diagnosis: v.final_diagnosis,
            doctor_notes: v.doctor_notes,
            pulse_summary: pulses.length > 0
              ? [...new Set(pulses.map((p) => p.name_viet))].join(", ")
              : null,
          }}
        />
      </div>
    </div>
  );
}
