import { notFound } from "next/navigation";
import { getInvoice } from "@/features/finance/queries";
import { getSessionUser } from "@/lib/auth";
import { InvoiceDetailClient } from "./InvoiceDetailClient";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, user] = await Promise.all([getInvoice(id), getSessionUser()]);
  if (!invoice || !user) notFound();

  return (
    <InvoiceDetailClient
      invoice={invoice}
      canCollect={user.role === "admin" || user.role === "practitioner"}
      canCancel={user.role === "admin"}
    />
  );
}
