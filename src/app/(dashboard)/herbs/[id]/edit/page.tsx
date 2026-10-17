import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { updateHerb } from "@/features/herbs/actions";
import { getHerb, getHerbImages } from "@/features/herbs/queries";
import { HerbForm } from "../../HerbForm";
import { HerbImageUpload } from "../../HerbImageUpload";
import { BackButton } from "@/components/shared/BackButton";

export default async function EditHerbPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin", "practitioner");
  const { id } = await params;
  const herb = await getHerb(id);
  if (!herb) notFound();
  const images = await getHerbImages(id);

  return (
    <div className="space-y-4">
      <BackButton href={`/herbs/${id}`} />
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
          Sửa vị thuốc <span className="font-mono text-base text-stone-500">{herb.code}</span>
        </h1>
      </div>
      <HerbForm
        action={updateHerb.bind(null, id)}
        initial={{
          name_common: herb.name_common,
          name_han_viet: herb.name_han_viet ?? "",
          name_science: herb.name_science ?? "",
          used_part: herb.used_part ?? "",
          property_tinh: herb.property_tinh ?? "",
          property_vi: herb.property_vi ?? "",
          quy_kinh: herb.quy_kinh?.join(", ") ?? "",
          cong_nang: herb.cong_nang ?? "",
          base_unit: herb.base_unit,
          is_valuable: herb.is_valuable,
        }}
        submitLabel="Lưu thay đổi"
      />
      <HerbImageUpload herbId={id} initialImages={images} />
    </div>
  );
}
