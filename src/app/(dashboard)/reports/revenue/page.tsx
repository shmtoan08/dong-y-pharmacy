export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRevenueKpi, getRevenueTrend } from "@/features/reports/actions";
import { ReportFilterBar } from "../ReportFilterBar";
import { RevenueChart } from "../ReportCharts";

export default async function RevenueReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const [kpi, trend] = await Promise.all([
    getRevenueKpi(sp.from, sp.to),
    getRevenueTrend(sp.from, sp.to, "day"),
  ]);

  const fmt = (n: number) => Number(n).toLocaleString("vi-VN") + "đ";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Báo cáo doanh thu</h1>
        <p className="text-sm text-stone-500">Tổng quan thu chi từ hóa đơn</p>
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
    </div>
  );
}
