import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getFormulaForEdit } from "@/features/formulas/queries";
import { FormulaForm } from "../../FormulaForm";

export default async function EditFormulaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin", "practitioner");
  const { id } = await params;

  const t = await getFormulaForEdit(id);
  if (!t) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-1.5 text-stone-600 hover:text-stone-900">
        <Link href="/formulas">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold">Sửa bài thuốc</h1>
        <p className="text-muted-foreground">
          {t.code} — đang ở v{t.version}, lưu sẽ tạo v{Number(t.version) + 1}.
          Version cũ được giữ nguyên.
        </p>
      </div>
      <FormulaForm
        mode="edit"
        editId={id}
        defaultValues={{
          name: t.name,
          category: t.category,
          source_book: t.source_book ?? "",
          syndrome: t.syndrome ?? "",
          indications: t.indications ?? "",
          usage_note: t.usage_note ?? "",
          items: t.items.map((it) => ({
            herb_name: it.herb_name,
            dosage_text: it.dosage_text ?? "",
            note: it.note ?? "",
          })),
        }}
      />
    </div>
  );
}
