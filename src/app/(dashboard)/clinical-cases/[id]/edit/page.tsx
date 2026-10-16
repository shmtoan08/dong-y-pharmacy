import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { updateClinicalCase } from "@/features/clinical-cases/actions";
import { getClinicalCaseForEdit } from "@/features/clinical-cases/queries";
import { ClinicalCaseForm } from "../../ClinicalCaseForm";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EditClinicalCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin", "practitioner");
  const { id } = await params;

  const data = await getClinicalCaseForEdit(id);
  if (!data) notFound();
  const { caseData: c, templates, symptoms, linkedSymptomIds } = data;

  const boundAction = updateClinicalCase.bind(null, id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackButton href={`/clinical-cases/${id}`} />
      <h1 className="text-2xl font-bold">
        Sửa biện chứng: {c.pattern ?? "(Chưa có tên)"}
      </h1>
      <p className="text-sm text-muted-foreground">Bệnh: {c.disease_name}</p>
      <Card>
        <CardHeader>
          <CardTitle>Thông tin biện chứng</CardTitle>
        </CardHeader>
        <CardContent>
          <ClinicalCaseForm
            action={boundAction}
            initial={{
              pattern: c.pattern,
              treatment_principle: c.treatment_principle,
              symptoms: c.symptoms,
              template_id: c.template_id,
              usage_instruction: c.usage_instruction,
              outcome: c.outcome,
              discussion: c.discussion,
              source: c.source,
            }}
            templates={templates}
            symptoms={symptoms}
            initialSymptomIds={linkedSymptomIds}
            submitLabel="Lưu thay đổi"
          />
        </CardContent>
      </Card>
    </div>
  );
}
