import { BackButton } from "@/components/shared/BackButton";
import { SupplierForm } from "../SupplierForm";
import { createSupplier } from "@/features/suppliers/actions";

export default function NewSupplierPage() {
  return (
    <div className="space-y-4">
      <BackButton href="/suppliers" />
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Thêm nhà cung cấp</h1>
        <p className="text-sm text-stone-500">Mã NCC sẽ được sinh tự động</p>
      </div>
      <SupplierForm />
    </div>
  );
}
