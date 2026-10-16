import { getStockCheck } from "@/features/inventory/queries";
import { getSessionUser } from "@/lib/auth";
import { CheckDetailClient } from "./CheckDetailClient";
import { notFound } from "next/navigation";

export default async function StockCheckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, user] = await Promise.all([getStockCheck(id), getSessionUser()]);
  if (!data || !user) notFound();

  const canConfirm = user.role === "admin" || user.role === "practitioner";

  return (
    <CheckDetailClient
      check={data.check}
      items={data.items}
      canConfirm={canConfirm}
    />
  );
}
