import { getStockCheck } from "@/features/inventory/queries";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/shared/PrintButton";

export default async function CheckPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getStockCheck(id);
  if (!data) notFound();
  const { check, items } = data;

  const totalDiff = items.reduce(
    (s, i) => s + (i.actual_qty !== null ? Number(i.actual_qty) - Number(i.system_qty) : 0),
    0,
  );
  const diffCount = items.filter(
    (i) => i.actual_qty !== null && Number(i.actual_qty) !== Number(i.system_qty),
  ).length;

  return (
    <div className="mx-auto max-w-4xl bg-white p-8 print:p-0">
      <div className="mb-6 flex items-start justify-between print:hidden">
        <h1 className="text-lg font-bold">Xem trước biên bản kiểm kê</h1>
        <PrintButton />
      </div>

      <div className="space-y-6 text-sm">
        <div className="text-center">
          <h2 className="text-xl font-bold">BIÊN BẢN KIỂM KÊ KHO DƯỢC LIỆU</h2>
          <p className="mt-1 text-stone-600">
            Số: {check.check_code} · Ngày: {new Date(check.created_at).toLocaleDateString("vi-VN")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <p><span className="font-medium">Người lập phiếu:</span> {check.created_by_name ?? "—"}</p>
          <p><span className="font-medium">Trạng thái:</span> {check.status === "confirmed" ? "Đã cân bằng" : check.status === "cancelled" ? "Đã hủy" : "Nháp"}</p>
          {check.note && <p className="col-span-2"><span className="font-medium">Ghi chú:</span> {check.note}</p>}
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border border-stone-300 bg-stone-100">
              <th className="border border-stone-300 px-2 py-1.5 text-left">STT</th>
              <th className="border border-stone-300 px-2 py-1.5 text-left">Mã lô / Vị thuốc</th>
              <th className="border border-stone-300 px-2 py-1.5 text-right">Tồn sổ sách</th>
              <th className="border border-stone-300 px-2 py-1.5 text-right">Tồn thực tế</th>
              <th className="border border-stone-300 px-2 py-1.5 text-right">Chênh lệch</th>
              <th className="border border-stone-300 px-2 py-1.5 text-left">Lý do</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i, idx) => {
              const diff = i.actual_qty !== null ? Number(i.actual_qty) - Number(i.system_qty) : null;
              return (
                <tr key={i.id} className="border border-stone-300">
                  <td className="border border-stone-300 px-2 py-1.5 text-center">{idx + 1}</td>
                  <td className="border border-stone-300 px-2 py-1.5">
                    <p className="font-mono text-xs">{i.lot_code}</p>
                    <p>{i.herb_name} ({i.herb_code})</p>
                  </td>
                  <td className="border border-stone-300 px-2 py-1.5 text-right">
                    {Number(i.system_qty).toLocaleString("vi-VN")} {i.base_unit}
                  </td>
                  <td className="border border-stone-300 px-2 py-1.5 text-right">
                    {i.actual_qty !== null ? `${Number(i.actual_qty).toLocaleString("vi-VN")} ${i.base_unit}` : "—"}
                  </td>
                  <td className="border border-stone-300 px-2 py-1.5 text-right font-medium">
                    {diff === null ? "—" : diff === 0 ? "0" : `${diff > 0 ? "+" : ""}${diff.toLocaleString("vi-VN")}`}
                  </td>
                  <td className="border border-stone-300 px-2 py-1.5 text-xs">{i.diff_reason ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="font-medium">
          Tổng chênh lệch: {totalDiff > 0 ? "+" : ""}{totalDiff.toLocaleString("vi-VN")} ({diffCount} lô chênh lệch / {items.length} lô)
        </p>

        <div className="grid grid-cols-3 gap-4 pt-8 text-center">
          <div>
            <p className="font-medium">Người kiểm kê</p>
            <p className="mt-16 text-xs text-stone-500">(Ký, ghi rõ họ tên)</p>
          </div>
          <div>
            <p className="font-medium">Thủ kho</p>
            <p className="mt-16 text-xs text-stone-500">(Ký, ghi rõ họ tên)</p>
          </div>
          <div>
            <p className="font-medium">Trưởng phòng khám</p>
            <p className="mt-16 text-xs text-stone-500">(Ký, ghi rõ họ tên)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
