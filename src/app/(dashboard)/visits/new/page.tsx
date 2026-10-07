import { getPatient } from "@/features/patients/actions";
import { getPulsePatterns } from "@/features/visits/actions";
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

  const [patient, patterns] = await Promise.all([
    getPatient(patientId),
    getPulsePatterns(),
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
        patientId={patient.id}
        patientName={patient.full_name}
        patterns={patterns}
      />
    </div>
  );
}
