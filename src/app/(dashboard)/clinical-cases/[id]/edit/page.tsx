import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateClinicalCase } from "@/features/clinical-cases/actions";
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

  const { rows } = await db.query(
    `SELECT c.*, d.name AS disease_name
     FROM clinical_cases c
     LEFT JOIN diseases d ON d.id = c.disease_id
     WHERE c.id = $1`,
    [id],
  );
  if (rows.length === 0) notFound();
  const c = rows[0];

  const { rows: templates } = await db.query<{ id: string; name: string; code: string }>(
    `SELECT DISTINCT ON (code) id, name, code FROM prescription_templates WHERE is_active = true ORDER BY code, version DESC`,
  );

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
            submitLabel="Lưu thay đổi"
          />
        </CardContent>
      </Card>
    </div>
  );
}
