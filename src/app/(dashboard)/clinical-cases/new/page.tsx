import { requireRole } from "@/lib/auth";
import { createDiseaseWithCases } from "@/features/clinical-cases/actions";
import { getNewCaseFormData } from "@/features/clinical-cases/queries";
import { DiseaseWithCasesForm } from "../DiseaseWithCasesForm";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewClinicalCasePage({
  searchParams,
}: {
  searchParams: Promise<{ disease?: string }>;
}) {
  await requireRole("admin", "practitioner");
  const sp = await searchParams;
  const preselectedDiseaseId = sp.disease ?? "";
  const { diseases, templates, symptoms } = await getNewCaseFormData();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackButton href="/clinical-cases" />
      <h1 className="text-2xl font-bold">Thêm bệnh án kinh nghiệm</h1>
      <Card>
        <CardHeader>
          <CardTitle>Bệnh + các biện chứng</CardTitle>
        </CardHeader>
        <CardContent>
          <DiseaseWithCasesForm
            action={createDiseaseWithCases}
            diseases={diseases}
            templates={templates}
            symptoms={symptoms}
            submitLabel="Lưu bệnh án"
            preselectedDiseaseId={preselectedDiseaseId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
