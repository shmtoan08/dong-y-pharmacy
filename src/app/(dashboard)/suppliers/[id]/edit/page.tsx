import { BackButton } from "@/components/shared/BackButton";
import { SupplierForm } from "../../SupplierForm";
import { getSupplier } from "@/features/suppliers/actions";
import { notFound } from "next/navigation";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  return (
    <div className="space-y-4">
      <BackButton href="/suppliers" />
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
          Sửa nhà cung cấp
        </h1>
        <p className="text-sm text-stone-500">{supplier.code} · {supplier.name}</p>
      </div>
      <SupplierForm id={id} initial={supplier} />
    </div>
  );
}
