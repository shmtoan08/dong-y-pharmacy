export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { listLots } from "@/features/inventory/actions";
import { listSuppliers } from "@/features/suppliers/actions";
import { LotFilterToolbar } from "./LotFilterToolbar";
import { PageSizeSelect } from "../visits/PageSizeSelect";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

const PAGE_SIZE = 10;

function expiryBadge(expiry: string | null): { label: string; cls: string } {
  if (!expiry) return { label: "Không HSD", cls: "bg-stone-200 text-stone-600" };
  const exp = new Date(expiry);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return { label: "Hết hạn", cls: "bg-red-100 text-red-800" };
  if (diffDays <= 30) return { label: `Còn ${diffDays} ngày`, cls: "bg-amber-100 text-amber-800" };
  return { label: new Date(expiry).toLocaleDateString("vi-VN"), cls: "bg-emerald-100 text-emerald-800" };
}

export default async function LotsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; expiry?: string; supplier?: string; stock?: string; page?: string; pageSize?: string }>;
}) {
  const sp = await searchParams;
  const [suppliers] = await Promise.all([listSuppliers()]);

  const expiry = (sp.expiry as "expired" | "expiring" | "valid" | "no_expiry" | undefined) ?? undefined;
  const supplierId = sp.supplier || undefined;
  const stockStatus = (sp.stock as "in_stock" | "out_of_stock" | undefined) ?? undefined;

  const lots = await listLots({ expiry, supplierId, stockStatus });

  const q = (sp.q ?? "").toLowerCase().trim();
  const filtered = q
    ? lots.filter(
        (l) =>
          l.herb_name.toLowerCase().includes(q) ||
          l.lot_code.toLowerCase().includes(q) ||
          l.herb_code.toLowerCase().includes(q),
      )
    : lots;

  const pageSize = Math.min(Math.max(Number(sp.pageSize) || PAGE_SIZE, 5), 50);
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

  const stockPct = (l: { quantity_current: number; quantity_initial: number }) => {
    const init = Number(l.quantity_initial);
    if (!init) return null;
    return Math.round((Number(l.quantity_current) / init) * 100);
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Quản lý lô hàng</h1>
          <p className="text-sm text-stone-500">{total} lô</p>
        </div>

        <LotFilterToolbar suppliers={suppliers} />

        {/* Bảng desktop */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left">
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Mã lô</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Vị thuốc</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Nhà cung cấp</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Ngày nhập</th>
                    <th className="px-4 py-2.5 text-right font-medium text-stone-600">Tồn lô</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Hạn sử dụng</th>
                    <th className="px-4 py-2.5 text-right font-medium text-stone-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => {
                    const badge = expiryBadge(l.expiry_date);
                    const pct = stockPct(l);
                    return (
                      <tr key={l.id} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <Link href={`/stock-lots/${l.id}`} className="font-mono text-xs font-medium hover:text-emerald-700 hover:underline">
                            {l.lot_code}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{l.herb_name}</p>
                          <p className="font-mono text-xs text-stone-500">{l.herb_code}</p>
                        </td>
                        <td className="px-4 py-2.5 text-stone-600">{l.supplier_name ?? "—"}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-stone-600">
                          {l.receipt_code ? (
                            <Link href={`/stock-receipts/${l.receipt_id}`} className="hover:text-emerald-700 hover:underline">
                              {l.receipt_code}
                            </Link>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                          {l.created_at && (
                            <p className="text-xs text-stone-400">
                              {new Date(l.created_at).toLocaleDateString("vi-VN")}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {Number(l.quantity_current).toLocaleString("vi-VN")} {l.base_unit}
                          <p className="text-xs text-stone-400">
                            / {Number(l.quantity_initial).toLocaleString("vi-VN")} nhập
                            {pct !== null && ` (${pct}%)`}
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge className={badge.cls}>{badge.label}</Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end">
                            <Tooltip label="Xem chi tiết">
                              <Link href={`/stock-lots/${l.id}`}>
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
                        Không tìm thấy lô hàng nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-4 py-3">
              <p className="text-sm text-stone-500">
                Hiển thị {total === 0 ? 0 : (page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, total)} trên {total} lô
              </p>
              <div className="flex items-center gap-3">
                <PageSizeSelect value={pageSize} options={[10, 25, 50]} basePath="/stock-lots" />
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
              Không tìm thấy lô hàng nào.
            </p>
          ) : (
            rows.map((l) => {
              const badge = expiryBadge(l.expiry_date);
              const pct = stockPct(l);
              return (
                <Card key={l.id}>
                  <CardContent className="space-y-1.5 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/stock-lots/${l.id}`} className="font-mono text-sm font-medium">
                        {l.lot_code}
                      </Link>
                      <Badge className={badge.cls}>{badge.label}</Badge>
                    </div>
                    <p className="text-sm text-stone-600">
                      <span className="text-stone-500">Vị thuốc:</span> {l.herb_name} ({l.herb_code})
                    </p>
                    <p className="text-sm font-medium">
                      Tồn: {Number(l.quantity_current).toLocaleString("vi-VN")}{l.base_unit} / {Number(l.quantity_initial).toLocaleString("vi-VN")}
                      {pct !== null && ` (${pct}%)`}
                    </p>
                    <p className="text-xs text-stone-500">
                      {l.receipt_code ? `Phiếu ${l.receipt_code}` : ""} · NCC: {l.supplier_name ?? "—"}
                    </p>
                    <div className="flex justify-end border-t border-stone-100 pt-2">
                      <Tooltip label="Xem chi tiết">
                        <Link href={`/stock-lots/${l.id}`}>
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
          {total > 0 && (
            <p className="text-center text-sm text-stone-500">
              Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} trên {total} lô
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
