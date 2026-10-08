export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRevenueKpi, getRevenueTrend, getPeriodInvoices } from "@/features/reports/actions";
import { ReportFilterBar } from "../ReportFilterBar";
import { RevenueChart } from "../ReportCharts";
import { ReportExportButton } from "../ReportExportButton";
import { PaginatedTable } from "../PaginatedTable";

const STATUS_LABEL: Record<string, string> = {
  unpaid: "Chưa thu",
  partial: "Thu một phần",
  paid: "Đã thu đủ",
  cancelled: "Đã hủy",
};

async function exportRevenueData(from?: string, to?: string) {
  "use server";
  const rows = await getPeriodInvoices(from, to);
  return {
    headers: ["Mã HĐ", "Bệnh nhân", "Tổng tiền", "Đã thu", "Trạng thái", "Ngày lập"],
    rows: rows.map((r) => [
      r.invoice_code,
      r.patient_name,
      String(Math.round(r.total)),
      String(Math.round(r.paid_total)),
      STATUS_LABEL[r.status] ?? r.status,
      new Date(r.created_at).toLocaleDateString("vi-VN"),
    ]),
  };
}

export default async function RevenueReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const [kpi, trend, invoices] = await Promise.all([
    getRevenueKpi(sp.from, sp.to),
    getRevenueTrend(sp.from, sp.to, "day"),
    getPeriodInvoices(sp.from, sp.to),
  ]);

  const fmt = (n: number) => Number(n).toLocaleString("vi-VN") + "đ";
  const exportFn = exportRevenueData.bind(null, sp.from, sp.to);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Báo cáo doanh thu</h1>
          <p className="text-sm text-stone-500">Tổng quan thu chi từ hóa đơn</p>
        </div>
        <ReportExportButton filename="bao-cao-doanh-thu" getData={exportFn} />
      </div>

      <ReportFilterBar basePath="/reports/revenue" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500">💰 Tổng doanh thu</p>
            <p className="mt-1 text-lg font-bold text-stone-900">{fmt(kpi.total_revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500">💵 Thực thu</p>
            <p className="mt-1 text-lg font-bold text-emerald-700">{fmt(kpi.total_collected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500">⏳ Công nợ</p>
            <p className="mt-1 text-lg font-bold text-red-700">{fmt(kpi.total_debt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500">🧾 Số hóa đơn</p>
            <p className="mt-1 text-lg font-bold text-stone-900">{kpi.invoice_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500">⚠️ Chưa thu đủ</p>
            <p className="mt-1 text-lg font-bold text-amber-700">{kpi.unpaid_count}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Xu hướng doanh thu theo ngày</CardTitle>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">Chưa có dữ liệu trong khoảng này.</p>
          ) : (
            <RevenueChart data={trend} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chi tiết hóa đơn trong kỳ ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PaginatedTable
            emptyText="Chưa có hóa đơn nào."
            headers={
              <>
                <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Mã HĐ</th>
                <th className="px-4 py-2.5 font-medium text-stone-600">Bệnh nhân</th>
                <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Ngày lập</th>
                <th className="px-4 py-2.5 text-right font-medium text-stone-600">Tổng tiền</th>
                <th className="px-4 py-2.5 text-right font-medium text-stone-600">Đã thu</th>
                <th className="px-4 py-2.5 font-medium text-stone-600">Trạng thái</th>
              </>
            }
            bodyRows={invoices.map((r) => (
              <tr key={r.invoice_code} className="border-b border-stone-100 hover:bg-stone-50">
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{r.invoice_code}</td>
                <td className="px-4 py-2.5">{r.patient_name}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-stone-600">
                  {new Date(r.created_at).toLocaleDateString("vi-VN")}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium">{fmt(r.total)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-emerald-700">{fmt(r.paid_total)}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline">{STATUS_LABEL[r.status] ?? r.status}</Badge>
                </td>
              </tr>
            ))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
