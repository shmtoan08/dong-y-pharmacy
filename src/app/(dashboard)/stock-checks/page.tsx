export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye } from "lucide-react";
import { listStockChecks } from "@/features/inventory/actions";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Nháp", cls: "bg-stone-200 text-stone-700" },
  confirmed: { label: "Đã xác nhận", cls: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Đã hủy", cls: "bg-red-100 text-red-700" },
};

export default async function StockChecksPage() {
  const checks = await listStockChecks();

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Kiểm kho</h1>
            <p className="text-sm text-stone-500">{checks.length} phiếu</p>
          </div>
          <Link href="/stock-checks/new">
            <Button className="bg-emerald-800 hover:bg-emerald-900">
              <Plus className="mr-1 h-4 w-4" /> Tạo phiếu kiểm kho
            </Button>
          </Link>
        </div>

        {/* Desktop */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Mã phiếu</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Ngày tạo</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Số lô</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Trạng thái</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Người tạo</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c) => {
                  const st = STATUS[c.status] ?? STATUS.draft;
                  return (
                    <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <Link href={`/stock-checks/${c.id}`} className="font-mono text-xs font-medium hover:text-emerald-700 hover:underline">
                          {c.check_code}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-stone-600">
                        {new Date(c.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-4 py-2.5">{c.item_count}</td>
                      <td className="px-4 py-2.5">
                        <Badge className={st.cls}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-stone-600">{c.created_by_name ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end">
                          <Tooltip label="Xem chi tiết">
                            <Link href={`/stock-checks/${c.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {checks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-500">
                      Chưa có phiếu kiểm kho nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {checks.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-500">
              Chưa có phiếu kiểm kho nào.
            </p>
          ) : (
            checks.map((c) => {
              const st = STATUS[c.status] ?? STATUS.draft;
              return (
                <Card key={c.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <Link href={`/stock-checks/${c.id}`} className="font-mono text-sm font-medium">
                        {c.check_code}
                      </Link>
                      <p className="text-xs text-stone-500">
                        {new Date(c.created_at).toLocaleDateString("vi-VN")} · {c.item_count} lô
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={st.cls}>{st.label}</Badge>
                      <Tooltip label="Xem chi tiết">
                        <Link href={`/stock-checks/${c.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </Tooltip>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
