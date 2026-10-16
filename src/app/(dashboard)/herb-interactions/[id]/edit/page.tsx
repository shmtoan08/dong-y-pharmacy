import { notFound } from "next/navigation";
import { InteractionForm } from "../../InteractionForm";
import { getInteraction } from "@/features/prescriptions/actions";
import { searchHerbs } from "@/features/herbs/queries";

export default async function EditInteractionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [interaction, herbs] = await Promise.all([
    getInteraction(id),
    searchHerbs("", 500),
  ]);
  if (!interaction) notFound();

  const simple = herbs.map((h: { id: string; name_common: string; code: string }) => ({
    id: h.id,
    name_common: h.name_common,
    code: h.code,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Sửa cặp tương kỵ</h1>
        <p className="text-sm text-stone-500">
          {interaction.herb_a_name} ⛔ {interaction.herb_b_name}
        </p>
      </div>
      <InteractionForm
        herbs={simple}
        interactionId={id}
        initial={{
          herbAId: interaction.herb_a_id,
          herbBId: interaction.herb_b_id,
          severity: interaction.severity,
          category: interaction.category,
          contraindicatedFor: interaction.contraindicated_for,
          symptoms: interaction.symptoms ?? "",
          antidote: interaction.antidote ?? "",
          description: interaction.description ?? "",
          source: interaction.source ?? "",
        }}
      />
    </div>
  );
}
