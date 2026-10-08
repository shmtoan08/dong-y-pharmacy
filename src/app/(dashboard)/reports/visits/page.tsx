export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVisitKpi, getVisitTrend } from "@/features/reports/actions";
import { ReportFilterBar } from "../ReportFilterBar";
import { VisitChart } from "../ReportCharts";

export default async function VisitsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const [kpi, trend] = await Promise.all([
    getVisitKpi(sp.from, sp.to),
    getVisitTrend(sp.from, sp.to, "day"),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Báo cáo lượt khám</h1>
        <p className="text-sm text-stone-500">Thống kê bệnh nhân và lượt khám</p>
      </div>

      <ReportFilterBar basePath="/reports/visits" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500">🩺 Tổng lượt khám</p>
            <p className="mt-1 text-xl font-bold text-stone-900">{kpi.total_visits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500">🆕 Bệnh nhân mới</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">{kpi.new_patients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500">🔁 Bệnh nhân quay lại</p>
            <p className="mt-1 text-xl font-bold text-stone-900">{kpi.returning_patients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500">📊 Tỷ lệ quay lại</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">{kpi.return_rate}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Xu hướng lượt khám theo ngày</CardTitle>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">Chưa có dữ liệu trong khoảng này.</p>
          ) : (
            <VisitChart data={trend} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
