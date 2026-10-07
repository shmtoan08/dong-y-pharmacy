import { requireRole } from "@/lib/auth";
import { FormulaForm } from "../FormulaForm";

export default async function NewFormulaPage() {
  await requireRole("admin", "practitioner");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Thêm bài thuốc mới</h1>
      <FormulaForm mode="create" />
    </div>
  );
}
