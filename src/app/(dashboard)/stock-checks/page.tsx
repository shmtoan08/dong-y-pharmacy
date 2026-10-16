export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Printer } from "lucide-react";
import { listStockChecks } from "@/features/inventory/queries";
import { CheckFilterToolbar } from "./CheckFilterToolbar";
import { PageSizeSelect } from "../visits/PageSizeSelect";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

const PAGE_SIZE = 10;

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Nháp", cls: "bg-stone-200 text-stone-700" },
  confirmed: { label: "Đã cân bằng", cls: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Đã hủy", cls: "bg-red-100 text-red-700" },
};

export default async function StockChecksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string; page?: string; pageSize?: string }>;
}) {
  const sp = await searchParams;
  const checks = await listStockChecks({
    q: sp.q || undefined,
    status: sp.status || undefined,
    dateFrom: sp.from || undefined,
    dateTo: sp.to || undefined,
  });

  const pageSize = Math.min(Math.max(Number(sp.pageSize) || PAGE_SIZE, 5), 50);
  const total = checks.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(Number(sp.page) || 1, 1), totalPages);
  const rows = checks.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (p: number) => {
    const params = new URLSearchParams(sp as Record<string, string>);
    params.set("page", String(p));
    params.set("pageSize", String(pageSize));
    return `?${params.toString()}`;
  };

  const diffBadge = (totalDiff: number, diffCount: number) => {
    const d = Number(totalDiff);
    if (diffCount === 0) {
      return <span className="font-medium text-emerald-700">Khớp 100%</span>;
    }
    return (
      <span className={`font-medium ${d < 0 ? "text-red-700" : "text-blue-700"}`}>
        Lệch: {d > 0 ? "+" : ""}{d.toLocaleString("vi-VN")} ({diffCount} lô)
      </span>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Kiểm kê kho</h1>
            <p className="text-sm text-stone-500">{total} phiếu</p>
          </div>
          <Link href="/stock-checks/new">
            <Button className="bg-emerald-800 hover:bg-emerald-900">
              <Plus className="mr-1 h-4 w-4" /> Tạo phiếu kiểm kho
            </Button>
          </Link>
        </div>

        <CheckFilterToolbar />

        {/* Desktop */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left">
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Mã phiếu</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Ngày kiểm</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Người kiểm</th>
                    <th className="px-4 py-2.5 text-center font-medium text-stone-600">Số lô</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Chênh lệch kho</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Trạng thái</th>
                    <th className="px-4 py-2.5 text-right font-medium text-stone-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
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
                        <td className="px-4 py-2.5 text-stone-600">{c.created_by_name ?? "—"}</td>
                        <td className="px-4 py-2.5 text-center">{c.item_count}</td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          {diffBadge(c.total_diff, c.diff_count)}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge className={st.cls}>{st.label}</Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1">
                            <Tooltip label="In biên bản">
                              <Link href={`/stock-checks/${c.id}/print`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </Link>
                            </Tooltip>
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
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-stone-500">
                        Không tìm thấy phiếu kiểm kho nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-4 py-3">
              <p className="text-sm text-stone-500">
                Hiển thị {total === 0 ? 0 : (page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, total)} trên {total} phiếu
              </p>
              <div className="flex items-center gap-3">
                <PageSizeSelect value={pageSize} options={[10, 25, 50]} basePath="/stock-checks" />
                <div className="flex items-center gap-1">
                  <Link href={pageHref(page - 1)}>
                    <Button variant="outline" size="sm" disabled={page <= 1} className="h-8 w-8 p-0">{"<"}</Button>
                  </Link>
                  <span className="px-2 text-sm text-stone-600">{page} / {totalPages}</span>
                  <Link href={pageHref(page + 1)}>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} className="h-8 w-8 p-0">{">"}</Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-500">
              Không tìm thấy phiếu kiểm kho nào.
            </p>
          ) : (
            rows.map((c) => {
              const st = STATUS[c.status] ?? STATUS.draft;
              return (
                <Card key={c.id}>
                  <CardContent className="space-y-1.5 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/stock-checks/${c.id}`} className="font-mono text-sm font-medium">
                        {c.check_code}
                      </Link>
                      <Badge className={st.cls}>{st.label}</Badge>
                    </div>
                    <p className="text-sm">{diffBadge(c.total_diff, c.diff_count)}</p>
                    <p className="text-xs text-stone-500">
                      {new Date(c.created_at).toLocaleDateString("vi-VN")} · {c.item_count} lô · {c.created_by_name ?? "—"}
                    </p>
                    <div className="flex justify-end gap-1 border-t border-stone-100 pt-2">
                      <Tooltip label="In biên bản">
                        <Link href={`/stock-checks/${c.id}/print`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </Link>
                      </Tooltip>
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
