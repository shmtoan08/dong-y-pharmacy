import { notFound } from "next/navigation";
import { getInvoice } from "@/features/finance/queries";
import { PrintButton } from "@/components/shared/PrintButton";

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  const fmt = (n: number) => Number(n).toLocaleString("vi-VN") + "đ";

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <div className="mb-6 flex items-start justify-between print:hidden">
        <h1 className="text-lg font-bold">Xem trước hóa đơn</h1>
        <PrintButton />
      </div>

      <div className="space-y-6 text-sm">
        <div className="text-center">
          <h2 className="text-lg font-bold">ĐÔNG Y ĐƯỜNG</h2>
          <p className="text-stone-600">Phòng khám Y học cổ truyền</p>
          <h3 className="mt-3 text-xl font-bold">HÓA ĐƠN THANH TOÁN</h3>
          <p className="mt-1">Số: <span className="font-mono font-medium">{invoice.invoice_code}</span></p>
          <p className="text-stone-600">Ngày: {new Date(invoice.created_at).toLocaleDateString("vi-VN")}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <p><span className="font-medium">Bệnh nhân:</span> {invoice.patient_name}</p>
          <p><span className="font-medium">Đơn thuốc:</span> <span className="font-mono">{invoice.prescription_code}</span></p>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border border-stone-300 bg-stone-100">
              <th className="border border-stone-300 px-2 py-1.5">STT</th>
              <th className="border border-stone-300 px-2 py-1.5 text-left">Vị thuốc</th>
              <th className="border border-stone-300 px-2 py-1.5 text-right">Số lượng</th>
              <th className="border border-stone-300 px-2 py-1.5 text-right">Đơn giá</th>
              <th className="border border-stone-300 px-2 py-1.5 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={i} className="border border-stone-300">
                <td className="border border-stone-300 px-2 py-1.5 text-center">{i + 1}</td>
                <td className="border border-stone-300 px-2 py-1.5">{it.herb_name}</td>
                <td className="border border-stone-300 px-2 py-1.5 text-right">{Number(it.quantity).toLocaleString("vi-VN")}</td>
                <td className="border border-stone-300 px-2 py-1.5 text-right">{fmt(it.unit_price)}</td>
                <td className="border border-stone-300 px-2 py-1.5 text-right">{fmt(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto w-64 space-y-1">
          <p className="flex justify-between"><span>Tạm tính:</span><span>{fmt(invoice.subtotal)}</span></p>
          <p className="flex justify-between"><span>Chiết khấu:</span><span>{fmt(invoice.discount)}</span></p>
          <p className="flex justify-between text-base font-bold border-t border-stone-300 pt-1">
            <span>Tổng cộng:</span><span>{fmt(invoice.total)}</span>
          </p>
          <p className="flex justify-between text-emerald-700"><span>Đã thu:</span><span>{fmt(invoice.paid_total)}</span></p>
          <p className="flex justify-between font-medium text-red-700"><span>Còn lại:</span><span>{fmt(invoice.remaining)}</span></p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-8 text-center">
          <div>
            <p className="font-medium">Người thu tiền</p>
            <p className="mt-16 text-xs text-stone-500">(Ký, ghi rõ họ tên)</p>
          </div>
          <div>
            <p className="font-medium">Bệnh nhân</p>
            <p className="mt-16 text-xs text-stone-500">(Ký, ghi rõ họ tên)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
