export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Printer } from "lucide-react";
import { listReceipts } from "@/features/inventory/queries";
import { getSessionUser } from "@/lib/auth";
import { ReceiptFilterToolbar } from "./ReceiptFilterToolbar";
import { PageSizeSelect } from "../visits/PageSizeSelect";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

const PAGE_SIZE = 10;

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

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; dateRange?: string; page?: string; pageSize?: string }>;
}) {
  const sp = await searchParams;
  const [receipts, user] = await Promise.all([listReceipts(), getSessionUser()]);
  const canCreate = user?.role === "admin" || user?.role === "practitioner";

  const q = (sp.q ?? "").toLowerCase().trim();
  const status = sp.status ?? "all";
  const dateRange = sp.dateRange ?? "all";
  const pageSize = Math.min(Math.max(Number(sp.pageSize) || PAGE_SIZE, 5), 50);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let filtered = receipts;
  if (q) {
    filtered = filtered.filter(
      (r) =>
        r.receipt_code.toLowerCase().includes(q) ||
        (r.supplier_name ?? "").toLowerCase().includes(q),
    );
  }
  if (status !== "all") filtered = filtered.filter((r) => r.status === status);
  if (dateRange === "today") {
    filtered = filtered.filter((r) => new Date(r.received_at) >= startOfToday);
  } else if (dateRange === "month") {
    filtered = filtered.filter((r) => new Date(r.received_at) >= startOfMonth);
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(Number(sp.page) || 1, 1), totalPages);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (p: number) => {
    const params = new URLSearchParams(sp as Record<string, string>);
    params.set("page", String(p));
    params.set("pageSize", String(pageSize));
    return `?${params.toString()}`;
  };

  const statusBadge = (s: string) => (
    <Badge className={STATUS_STYLE[s]}>{STATUS_LABEL[s] ?? s}</Badge>
  );

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
              Phiếu nhập kho
            </h1>
            <p className="text-sm text-stone-500">{total} phiếu</p>
          </div>
          {canCreate && (
            <Link href="/stock-receipts/new">
              <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900">
                <Plus className="mr-1 h-4 w-4" /> Tạo phiếu nhập
              </Button>
            </Link>
          )}
        </div>

        <ReceiptFilterToolbar />

        {/* Bảng desktop */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left">
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Mã phiếu</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Nhà cung cấp</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Ngày nhập</th>
                    <th className="px-4 py-2.5 text-right font-medium text-stone-600">Số dòng</th>
                    <th className="px-4 py-2.5 text-right font-medium text-stone-600">Tổng tiền</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Trạng thái</th>
                    <th className="px-4 py-2.5 text-right font-medium text-stone-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs font-medium">{r.receipt_code}</td>
                      <td className="px-4 py-2.5">{r.supplier_name ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-stone-600">
                        {new Date(r.received_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-4 py-2.5 text-right">{r.item_count}</td>
                      <td className="px-4 py-2.5 text-right">
                        {r.total_amount ? `${Number(r.total_amount).toLocaleString("vi-VN")} đ` : "—"}
                      </td>
                      <td className="px-4 py-2.5">{statusBadge(r.status)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Tooltip label="In phiếu nhập">
                            <Link href={`/stock-receipts/${r.id}/print`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Printer className="h-4 w-4" />
                              </Button>
                            </Link>
                          </Tooltip>
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
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-stone-500">
                        Không tìm thấy phiếu nhập nào.
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
                <PageSizeSelect value={pageSize} options={[10, 25, 50]} basePath="/stock-receipts" />
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

        {/* Cards mobile */}
        <div className="space-y-3 md:hidden">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-500">
              Không tìm thấy phiếu nhập nào.
            </p>
          ) : (
            rows.map((r) => (
              <Card key={r.id}>
                <CardContent className="space-y-1.5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-sm font-medium">{r.receipt_code}</p>
                    {statusBadge(r.status)}
                  </div>
                  <p className="text-sm text-stone-600">
                    <span className="text-stone-500">NCC:</span> {r.supplier_name ?? "—"}
                  </p>
                  <p className="text-sm text-stone-600">
                    {new Date(r.received_at).toLocaleDateString("vi-VN")} · {r.item_count} vị thuốc
                  </p>
                  {r.total_amount ? (
                    <p className="text-sm font-semibold">
                      {Number(r.total_amount).toLocaleString("vi-VN")} đ
                    </p>
                  ) : null}
                  <div className="flex justify-end gap-1 border-t border-stone-100 pt-2">
                    <Tooltip label="In phiếu nhập">
                      <Link href={`/stock-receipts/${r.id}/print`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </Link>
                    </Tooltip>
                    <Tooltip label="Xem chi tiết">
                      <Link href={`/stock-receipts/${r.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          {total > 0 && (
            <p className="text-center text-sm text-stone-500">
              Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} trên {total} phiếu
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
