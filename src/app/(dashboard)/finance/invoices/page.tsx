export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Printer } from "lucide-react";
import { listInvoices, getInvoiceKpi } from "@/features/finance/actions";
import { InvoiceFilterToolbar } from "./InvoiceFilterToolbar";
import { ExportExcelButton } from "./ExportExcelButton";
import { QuickCollectButton } from "./QuickCollectButton";
import { PageSizeSelect } from "../../visits/PageSizeSelect";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { getSessionUser } from "@/lib/auth";

const PAGE_SIZE = 10;

const STATUS: Record<string, { label: string; cls: string }> = {
  unpaid: { label: "Chưa thu", cls: "bg-red-100 text-red-800" },
  partial: { label: "Thu một phần", cls: "bg-amber-100 text-amber-800" },
  paid: { label: "Đã thu đủ", cls: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Đã hủy", cls: "bg-stone-200 text-stone-600" },
};

function timeRange(preset: string | undefined, from: string | undefined, to: string | undefined) {
  if (preset === "today") {
    const d = new Date().toISOString().slice(0, 10);
    return { from: d, to: d };
  }
  if (preset === "month") {
    const now = new Date();
    const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    return { from: d, to: undefined };
  }
  if (preset === "custom") return { from, to };
  return {};
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; time?: string; from?: string; to?: string; method?: string; page?: string; pageSize?: string }>;
}) {
  const sp = await searchParams;
  const tr = timeRange(sp.time, sp.from, sp.to);
  const [rows, kpi, user] = await Promise.all([
    listInvoices({
      q: sp.q || undefined,
      status: sp.status || undefined,
      from: tr.from,
      to: tr.to,
      method: sp.method || undefined,
    }),
    getInvoiceKpi(),
    getSessionUser(),
  ]);

  const canCollect = user?.role === "admin" || user?.role === "practitioner";

  const pageSize = Math.min(Math.max(Number(sp.pageSize) || PAGE_SIZE, 5), 50);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(Number(sp.page) || 1, 1), totalPages);
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (p: number) => {
    const params = new URLSearchParams(sp as Record<string, string>);
    params.set("page", String(p));
    params.set("pageSize", String(pageSize));
    return `?${params.toString()}`;
  };

  const fmt = (n: number) => Number(n).toLocaleString("vi-VN") + "đ";

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Hóa đơn & Thanh toán</h1>
            <p className="text-sm text-stone-500">{total} hóa đơn</p>
          </div>
          <ExportExcelButton />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-stone-500">💰 Tổng doanh thu</p>
              <p className="mt-1 text-xl font-bold text-stone-900">{fmt(kpi.total_revenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-stone-500">💵 Đã thực thu</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">{fmt(kpi.total_collected)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-stone-500">⏳ Công nợ / Còn nợ</p>
              <p className="mt-1 text-xl font-bold text-red-700">{fmt(kpi.total_debt)}</p>
            </CardContent>
          </Card>
        </div>

        <InvoiceFilterToolbar />

        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left">
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Mã HĐ</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Bệnh nhân</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Ngày lập</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Đơn thuốc</th>
                    <th className="px-4 py-2.5 text-right font-medium text-stone-600">Tổng tiền</th>
                    <th className="px-4 py-2.5 text-right font-medium text-stone-600">Đã thu</th>
                    <th className="px-4 py-2.5 text-right font-medium text-stone-600">Còn lại</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Trạng thái</th>
                    <th className="px-4 py-2.5 text-right font-medium text-stone-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => {
                    const st = STATUS[r.status];
                    return (
                      <tr key={r.id} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <Link href={`/finance/invoices/${r.id}`} className="font-mono text-xs font-medium hover:text-emerald-700 hover:underline">
                            {r.invoice_code}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
                          {r.patient_name}
                          {r.patient_phone && <span className="block text-xs text-stone-500">{r.patient_phone}</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-stone-600">
                          {new Date(r.created_at).toLocaleDateString("vi-VN")}
                          <span className="block text-xs">
                            {new Date(r.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <Link href={`/prescriptions/${r.prescription_id}`} className="font-mono text-xs text-emerald-700 hover:underline">
                            {r.prescription_code}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium">{fmt(r.total)}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right text-emerald-700">{fmt(r.paid_total)}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-red-700">{fmt(r.remaining)}</td>
                        <td className="px-4 py-2.5"><Badge className={st.cls}>{st.label}</Badge></td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1">
                            {canCollect && r.remaining > 0.01 && (r.status === "unpaid" || r.status === "partial") && (
                              <QuickCollectButton invoiceId={r.id} remaining={r.remaining} />
                            )}
                            <Tooltip label="In hóa đơn">
                              <Link href={`/finance/invoices/${r.id}/print`}>
                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </Link>
                            </Tooltip>
                            <Tooltip label="Xem chi tiết">
                              <Link href={`/finance/invoices/${r.id}`}>
                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {pageRows.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-stone-500">Không có hóa đơn nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-4 py-3">
              <p className="text-sm text-stone-500">
                Hiển thị {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} trên {total} hóa đơn
              </p>
              <div className="flex items-center gap-3">
                <PageSizeSelect value={pageSize} options={[10, 25, 50]} basePath="/finance/invoices" />
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

        <div className="space-y-3 md:hidden">
          {pageRows.map((r) => {
            const st = STATUS[r.status];
            return (
              <Card key={r.id}>
                <CardContent className="space-y-1.5 p-4">
                  <div className="flex items-center justify-between">
                    <Link href={`/finance/invoices/${r.id}`} className="font-mono text-sm font-medium">
                      {r.invoice_code}
                    </Link>
                    <Badge className={st.cls}>{st.label}</Badge>
                  </div>
                  <p className="text-sm text-stone-600">
                    Bệnh nhân: {r.patient_name}{r.patient_phone ? ` (${r.patient_phone})` : ""}
                  </p>
                  <p className="text-sm text-stone-600">
                    Ngày lập: {new Date(r.created_at).toLocaleDateString("vi-VN")} ·
                    Đơn: <Link href={`/prescriptions/${r.prescription_id}`} className="font-mono text-xs text-emerald-700">{r.prescription_code}</Link>
                  </p>
                  <p className="text-sm">
                    Tổng tiền: <span className="font-medium">{fmt(r.total)}</span>
                  </p>
                  <p className="text-sm">
                    Đã thanh toán: <span className="font-medium text-emerald-700">{fmt(r.paid_total)}</span>
                    {" "}(Còn lại: <span className="font-medium text-red-700">{fmt(r.remaining)}</span>)
                  </p>
                  <div className="flex justify-end gap-2 border-t border-stone-100 pt-2">
                    <Link href={`/finance/invoices/${r.id}/print`}>
                      <Button variant="outline" size="sm" className="h-10">
                        <Printer className="mr-1 h-4 w-4" /> In hóa đơn
                      </Button>
                    </Link>
                    <Link href={`/finance/invoices/${r.id}`}>
                      <Button variant="outline" size="sm" className="h-10">
                        <Eye className="mr-1 h-4 w-4" /> Chi tiết
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {pageRows.length === 0 && (
            <p className="py-6 text-center text-sm text-stone-500">Không có hóa đơn nào.</p>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Link href={pageHref(page - 1)}>
                <Button variant="outline" size="sm" disabled={page <= 1}>Trước</Button>
              </Link>
              <span className="text-sm text-stone-600">{page} / {totalPages}</span>
              <Link href={pageHref(page + 1)}>
                <Button variant="outline" size="sm" disabled={page >= totalPages}>Sau</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
