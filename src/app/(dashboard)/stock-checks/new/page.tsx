import { NewCheckForm } from "./NewCheckForm";
import { listLots } from "@/features/inventory/queries";

export default async function NewStockCheckPage() {
  const lots = await listLots({ stockStatus: "in_stock" });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Tạo phiếu kiểm kho</h1>
        <p className="text-sm text-stone-500">
          Hệ thống sẽ chụp tồn hiện tại làm mốc đối chiếu.
        </p>
      </div>
      <NewCheckForm lots={lots} />
    </div>
  );
}
