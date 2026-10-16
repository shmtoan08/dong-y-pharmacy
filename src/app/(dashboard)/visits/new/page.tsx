import { getPatient } from "@/features/patients/queries";
import {
  getPulsePatterns,
  getPatientVisitCount,
} from "@/features/visits/queries";
import { VisitForm } from "./VisitForm";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/shared/BackButton";

export default async function NewVisitPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const { patientId } = await searchParams;
  if (!patientId) notFound();

  const [patient, patterns, visitCount] = await Promise.all([
    getPatient(patientId),
    getPulsePatterns(),
    getPatientVisitCount(patientId),
  ]);
  if (!patient) notFound();

  return (
    <div className="space-y-4">
      <BackButton href={`/patients/${patientId}`} />
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Khám bệnh mới</h1>
        <p className="text-sm text-stone-500">
          {patient.full_name} · {patient.patient_code}
        </p>
      </div>
      <VisitForm
        patient={patient}
        visitCount={visitCount}
        patterns={patterns}
      />
    </div>
  );
}
