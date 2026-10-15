import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createClinicalCase } from "@/features/clinical-cases/actions";
import { ClinicalCaseForm } from "../ClinicalCaseForm";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewClinicalCasePage() {
  await requireRole("admin", "practitioner");
  const { rows: templates } = await db.query<{ id: string; name: string; code: string }>(
    `SELECT id, name, code FROM prescription_templates WHERE is_active = true ORDER BY name`,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackButton href="/clinical-cases" />
      <h1 className="text-2xl font-bold">Thêm bệnh án kinh nghiệm</h1>
      <Card>
        <CardHeader>
          <CardTitle>Thông tin bệnh án</CardTitle>
        </CardHeader>
        <CardContent>
          <ClinicalCaseForm
            action={createClinicalCase}
            templates={templates}
            submitLabel="Tạo bệnh án"
          />
        </CardContent>
      </Card>
    </div>
  );
}
