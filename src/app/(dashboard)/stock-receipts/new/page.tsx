export const dynamic = "force-dynamic";

import { NewReceiptForm } from "./NewReceiptForm";
import { listSuppliers } from "@/features/suppliers/actions";

export default async function NewReceiptPage() {
  const suppliers = await listSuppliers(true);
  return <NewReceiptForm suppliers={suppliers} />;
}
