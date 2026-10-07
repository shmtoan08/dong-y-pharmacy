import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getReceipt } from "@/features/inventory/actions";
import { getSessionUser } from "@/lib/auth";
import { ReceiptActions } from "./ReceiptActions";
import { notFound } from "next/navigation";

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  confirmed: "Đã nhập kho",
  cancelled: "Đã hủy",
};
const STATUS_STYLE: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-stone-200 text-stone-600",
};

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [receipt, user] = await Promise.all([getReceipt(id), getSessionUser()]);
  if (!receipt || !user) notFound();

  const canAct =
    (user.role === "admin" || user.role === "practitioner") &&
    receipt.status === "draft";

  const total = receipt.items.reduce(
    (sum, it) => sum + it.quantity * (it.unit_price ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      <BackButton href="/stock-receipts" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-stone-900 md:text-2xl">
            {receipt.receipt_code}
            <Badge className={STATUS_STYLE[receipt.status]}>
              {STATUS_LABEL[receipt.status]}
            </Badge>
          </h1>
          <p className="text-sm text-stone-500">
            {receipt.supplier_name ?? "Không có NCC"} ·{" "}
            {new Date(receipt.received_at).toLocaleDateString("vi-VN")} · Tạo bởi{" "}
            {receipt.created_by_name}
            {receipt.confirmed_by_name && (
              <> · Xác nhận bởi {receipt.confirmed_by_name}</>
            )}
          </p>
        </div>
        {canAct && <ReceiptActions receiptId={id} />}
      </div>

      {receipt.note && (
        <Card>
          <CardContent className="p-4 text-sm text-stone-600">
            <span className="font-medium">Ghi chú:</span> {receipt.note}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Dòng phiếu ({receipt.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-stone-600">Vị thuốc</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Số lượng</th>
                  <th className="hidden px-4 py-2.5 text-right font-medium text-stone-600 md:table-cell">Đơn giá</th>
                  <th className="hidden px-4 py-2.5 text-right font-medium text-stone-600 md:table-cell">Thành tiền</th>
                  <th className="hidden px-4 py-2.5 font-medium text-stone-600 lg:table-cell">HSD</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Mã lô</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((it) => (
                  <tr key={it.id} className="border-b border-stone-100">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{it.herb_name}</p>
                      <p className="font-mono text-xs text-stone-500">{it.herb_code}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {Number(it.quantity).toLocaleString("vi-VN")} {it.base_unit}
                    </td>
                    <td className="hidden px-4 py-2.5 text-right md:table-cell">
                      {it.unit_price ? `${Number(it.unit_price).toLocaleString("vi-VN")} đ` : "—"}
                    </td>
                    <td className="hidden px-4 py-2.5 text-right md:table-cell">
                      {it.unit_price
                        ? `${(it.quantity * it.unit_price).toLocaleString("vi-VN")} đ`
                        : "—"}
                    </td>
                    <td className="hidden px-4 py-2.5 lg:table-cell">
                      {it.expiry_date
                        ? new Date(it.expiry_date).toLocaleDateString("vi-VN")
                        : <span className="text-stone-400">Không HSD</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {it.lot_code ?? <span className="text-stone-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 0 && (
            <div className="border-t border-stone-200 p-4 text-right text-sm">
              <span className="font-medium">Tổng tiền: </span>
              <span className="font-bold">{total.toLocaleString("vi-VN")} đ</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
