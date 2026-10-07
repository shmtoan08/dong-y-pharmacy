import { getPrescription } from "@/features/prescriptions/actions";
import { getSessionUser } from "@/lib/auth";
import { PrescriptionDetailClient } from "./PrescriptionDetailClient";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/shared/BackButton";

export default async function PrescriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [prescription, user] = await Promise.all([
    getPrescription(id),
    getSessionUser(),
  ]);
  if (!prescription || !user) notFound();

  const canEdit = user.role === "admin" || user.role === "practitioner";
  const canDispense = true; // admin/practitioner/dispenser đều được đánh dấu bốc thuốc

  return (
    <div className="space-y-4">
      <BackButton href={`/patients/${prescription.patient_id}`} />
      <PrescriptionDetailClient
      prescription={prescription}
      canEdit={canEdit}
      canDispense={canDispense}
      />
    </div>
  );
}
