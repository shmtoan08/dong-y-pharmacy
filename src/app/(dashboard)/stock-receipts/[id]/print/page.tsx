import { getReceipt } from "@/features/inventory/actions";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/shared/BackButton";
import { PrintButton } from "@/components/shared/PrintButton";

export default async function PrintReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = await getReceipt(id);
  if (!receipt) notFound();

  const total = receipt.items.reduce(
    (sum, it) => sum + it.quantity * (it.unit_price ?? 0),
    0,
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="no-print flex items-center justify-center gap-4 p-4 print:hidden">
        <BackButton href={`/stock-receipts/${id}`} />
        <PrintButton label="In phiếu nhập" />
      </div>

      <div className="mx-auto max-w-3xl p-8 text-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold">ĐÔNG Y ĐƯỜNG</h1>
          <p className="text-stone-600">Phòng thuốc Đông y</p>
          <h2 className="mt-4 text-lg font-bold underline underline-offset-4">
            PHIẾU NHẬP KHO
          </h2>
          <p className="mt-1 font-mono">Số: {receipt.receipt_code}</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 border-y border-stone-300 py-3">
          <p><span className="font-semibold">Nhà cung cấp:</span> {receipt.supplier_name ?? "—"}</p>
          <p><span className="font-semibold">Ngày nhập:</span> {new Date(receipt.received_at).toLocaleDateString("vi-VN")}</p>
          <p><span className="font-semibold">Người lập:</span> {receipt.created_by_name}</p>
          <p><span className="font-semibold">Người xác nhận:</span> {receipt.confirmed_by_name ?? "—"}</p>
          {receipt.note && (
            <p className="col-span-2"><span className="font-semibold">Ghi chú:</span> {receipt.note}</p>
          )}
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-stone-800">
              <th className="py-2 text-left">STT</th>
              <th className="py-2 text-left">Vị thuốc</th>
              <th className="py-2 text-right">Số lượng</th>
              <th className="py-2 text-right">Đơn giá</th>
              <th className="py-2 text-right">Thành tiền</th>
              <th className="py-2 text-left">Số lô NCC</th>
              <th className="py-2 text-left">Mã lô</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((it, idx) => (
              <tr key={it.id} className="border-b border-stone-200">
                <td className="py-2">{idx + 1}</td>
                <td className="py-2">
                  {it.herb_name}
                  <span className="ml-1 font-mono text-xs text-stone-500">{it.herb_code}</span>
                </td>
                <td className="py-2 text-right">
                  {Number(it.quantity).toLocaleString("vi-VN")} {it.base_unit}
                </td>
                <td className="py-2 text-right">
                  {it.unit_price ? Number(it.unit_price).toLocaleString("vi-VN") : "—"}
                </td>
                <td className="py-2 text-right">
                  {it.unit_price ? (it.quantity * it.unit_price).toLocaleString("vi-VN") : "—"}
                </td>
                <td className="py-2">{it.supplier_lot_code ?? "—"}</td>
                <td className="py-2 font-mono text-xs">{it.lot_code ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 0 && (
          <p className="mt-3 text-right font-bold">
            Tổng tiền: {total.toLocaleString("vi-VN")} đ
          </p>
        )}

        <div className="mt-10 flex justify-between text-center">
          <div>
            <p className="font-semibold">Bên giao</p>
            <p className="mt-14 text-xs text-stone-500">(Ký, ghi rõ họ tên)</p>
          </div>
          <div>
            <p className="font-semibold">Thủ kho</p>
            <p className="mt-14 text-xs text-stone-500">(Ký, ghi rõ họ tên)</p>
          </div>
        </div>
      </div>

      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  );
}
