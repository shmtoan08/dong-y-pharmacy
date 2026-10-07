import { requireRole } from "@/lib/auth";
import { createHerb } from "@/features/herbs/actions";
import { HerbForm } from "../HerbForm";
import { BackButton } from "@/components/shared/BackButton";

export default async function NewHerbPage() {
  await requireRole("admin", "practitioner");

  return (
    <div className="space-y-4">
      <BackButton href="/herbs" />
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Thêm vị thuốc</h1>
        <p className="text-sm text-stone-500">Mã vị thuốc sẽ được sinh tự động (VT-XXXX)</p>
      </div>
      <HerbForm action={createHerb} submitLabel="Lưu vị thuốc" />
    </div>
  );
}
