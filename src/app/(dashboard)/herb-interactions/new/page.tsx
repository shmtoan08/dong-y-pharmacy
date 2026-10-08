import { InteractionForm } from "../InteractionForm";
import { searchHerbs } from "@/features/herbs/actions";
import { BackButton } from "@/components/shared/BackButton";

export default async function NewInteractionPage() {
  const herbs = await searchHerbs("", 500);
  const simple = herbs.map((h: { id: string; name_common: string; code: string }) => ({
    id: h.id,
    name_common: h.name_common,
    code: h.code,
  }));

  return (
    <div className="space-y-4">
      <BackButton href="/herb-interactions" />
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Thêm cặp tương kỵ</h1>
        <p className="text-sm text-stone-500">
          Cặp mới cần được thầy thuốc kiểm duyệt mới bật cảnh báo.
        </p>
      </div>
      <InteractionForm herbs={simple} />
    </div>
  );
}
