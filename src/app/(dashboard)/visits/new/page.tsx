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

  const { db } = await import("@/lib/db");
  const vcRes = await db.query<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM visits WHERE patient_id = $1`,
    [patientId],
  );
  const visitCount = Number(vcRes.rows[0]?.cnt ?? 0);

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
