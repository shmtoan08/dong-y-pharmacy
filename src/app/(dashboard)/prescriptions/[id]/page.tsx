import { getPrescription } from "@/features/prescriptions/actions";
import { getSessionUser } from "@/lib/auth";
import { PrescriptionDetailClient } from "./PrescriptionDetailClient";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/shared/BackButton";
import { RepriseButton } from "./RepriseButton";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import Link from "next/link";
import { TooltipProvider } from "@/components/ui/tooltip";

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
  const canDispense = true;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <BackButton href={`/patients/${prescription.patient_id}`} />
          <div className="flex gap-2">
            <Link href={`/prescriptions/${id}/print`}>
              <Button variant="outline" size="sm">
                <Printer className="mr-1 h-4 w-4" /> In đơn thuốc
              </Button>
            </Link>
            {canEdit && (
              <RepriseButton prescriptionId={id} prescriptionCode={prescription.prescription_code} />
            )}
          </div>
        </div>
        <PrescriptionDetailClient
          prescription={prescription}
          canEdit={canEdit}
          canDispense={canDispense}
        />
      </div>
    </TooltipProvider>
  );
}
