export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye } from "lucide-react";
import { listReceipts } from "@/features/inventory/actions";
import { getSessionUser } from "@/lib/auth";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

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

export default async function ReceiptsPage() {
  const [receipts, user] = await Promise.all([listReceipts(), getSessionUser()]);
  const canCreate = user?.role === "admin" || user?.role === "practitioner";

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
              Phiếu nhập kho
            </h1>
            <p className="text-sm text-stone-500">{receipts.length} phiếu</p>
          </div>
          {canCreate && (
            <Link href="/stock-receipts/new">
              <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900">
                <Plus className="mr-1 h-4 w-4" /> Tạo phiếu nhập
              </Button>
            </Link>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left">
                    <th className="px-4 py-2.5 font-medium text-stone-600">Mã phiếu</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Nhà cung cấp</th>
                    <th className="hidden px-4 py-2.5 font-medium text-stone-600 md:table-cell">Ngày nhập</th>
                    <th className="px-4 py-2.5 text-right font-medium text-stone-600">Số dòng</th>
                    <th className="hidden px-4 py-2.5 text-right font-medium text-stone-600 lg:table-cell">Tổng tiền</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Trạng thái</th>
                    <th className="px-4 py-2.5 text-right font-medium text-stone-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r) => (
                    <tr key={r.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-2.5 font-mono text-xs font-medium">{r.receipt_code}</td>
                      <td className="px-4 py-2.5">{r.supplier_name ?? "—"}</td>
                      <td className="hidden px-4 py-2.5 text-stone-600 md:table-cell">
                        {new Date(r.received_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-4 py-2.5 text-right">{r.item_count}</td>
                      <td className="hidden px-4 py-2.5 text-right lg:table-cell">
                        {r.total_amount ? `${Number(r.total_amount).toLocaleString("vi-VN")} đ` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge className={STATUS_STYLE[r.status]}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end">
                          <Tooltip label="Xem chi tiết">
                            <Link href={`/stock-receipts/${r.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {receipts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-stone-500">
                        Chưa có phiếu nhập nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
