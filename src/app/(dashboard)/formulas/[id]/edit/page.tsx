import { BackButton } from "@/components/shared/BackButton";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { FormulaForm } from "../../FormulaForm";

export default async function EditFormulaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin", "practitioner");
  const { id } = await params;

  const { rows: tpl } = await db.query(
    `SELECT name, category, source_book, syndrome, indications, usage_note, version, code
     FROM prescription_templates WHERE id = $1`,
    [id],
  );
  if (tpl.length === 0) notFound();
  const t = tpl[0];

  const { rows: items } = await db.query(
    `SELECT herb_name, dosage_text, note
     FROM prescription_template_items
     WHERE template_id = $1 ORDER BY sort_order`,
    [id],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackButton href={`/formulas/${id}`} />
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
          items: items.map((it) => ({
            herb_name: it.herb_name,
            dosage_text: it.dosage_text,
            note: it.note ?? "",
          })),
        }}
      />
    </div>
  );
}
