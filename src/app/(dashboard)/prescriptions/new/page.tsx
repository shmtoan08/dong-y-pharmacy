import {
  getActiveTemplatesForPrescription,
  getTemplateItemsForPrescription,
} from "@/features/prescriptions/actions";
import { getPatient } from "@/features/patients/actions";
import { db } from "@/lib/db";
import { PrescriptionBuilder } from "@/components/prescriptions/PrescriptionBuilder";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/shared/BackButton";

export default async function NewPrescriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ visitId?: string; templateId?: string }>;
}) {
  const { visitId, templateId } = await searchParams;
  if (!visitId) notFound();

  // Lấy thông tin visit + bệnh nhân
  const { rows: vr } = await db.query(
    `SELECT v.id, pt.id AS patient_id, pt.full_name, pt.patient_code
     FROM visits v JOIN patients pt ON pt.id = v.patient_id
     WHERE v.id = $1`,
    [visitId],
  );
  if (vr.length === 0) notFound();

  const templates = await getActiveTemplatesForPrescription();
  const initialItems = templateId
    ? await getTemplateItemsForPrescription(templateId)
    : undefined;

  return (
    <div className="space-y-4">
      <BackButton href={`/patients/${vr[0].patient_id}`} />
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Kê đơn mới</h1>
        <p className="text-sm text-stone-500">
          {vr[0].full_name} · {vr[0].patient_code}
        </p>
      </div>
      <PrescriptionBuilder
        visitId={visitId}
        templates={templates}
        initialTemplateId={templateId}
        initialItems={initialItems}
      />
    </div>
  );
}
