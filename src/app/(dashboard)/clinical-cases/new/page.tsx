import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createDiseaseWithCases, getAllSymptoms } from "@/features/clinical-cases/actions";
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
  const { rows: diseases } = await db.query<{ id: string; name: string }>(
    `SELECT id, name FROM diseases WHERE is_active = true ORDER BY name`,
  );
  const { rows: templates } = await db.query<{ id: string; name: string; code: string }>(
    `SELECT DISTINCT ON (code) id, name, code FROM prescription_templates WHERE is_active = true ORDER BY code, version DESC`,
  );
  const symptoms = await getAllSymptoms();

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
