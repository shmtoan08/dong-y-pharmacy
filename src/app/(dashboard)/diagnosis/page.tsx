import { requireRole } from "@/lib/auth";
import { getAllSymptoms } from "@/features/clinical-cases/actions";
import { DiagnosisForm } from "./DiagnosisForm";

export default async function DiagnosisPage() {
  await requireRole("admin", "practitioner", "dispenser");
  const symptoms = await getAllSymptoms();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chẩn đoán</h1>
        <p className="text-sm text-muted-foreground">
          Chọn triệu chứng của người bệnh để gợi ý các bệnh án kinh nghiệm có biện chứng liên quan.
        </p>
      </div>
      <DiagnosisForm symptoms={symptoms} />
    </div>
  );
}
