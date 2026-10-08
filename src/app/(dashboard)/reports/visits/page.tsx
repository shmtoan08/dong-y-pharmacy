export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVisitKpi, getVisitTrend, getPeriodVisits } from "@/features/reports/actions";
import { ReportFilterBar } from "../ReportFilterBar";
import { VisitChart } from "../ReportCharts";
import { ReportExportButton } from "../ReportExportButton";

async function exportVisitData(from?: string, to?: string) {
  "use server";
  const rows = await getPeriodVisits(from, to);
  return {
    headers: ["Ngày khám", "Bệnh nhân", "Bác sĩ", "Chẩn đoán"],
    rows: rows.map((r) => [
      new Date(r.visited_at).toLocaleDateString("vi-VN"),
      r.patient_name,
      r.practitioner_name ?? "",
      r.diagnosis ?? "",
    ]),
  };
}

export default async function VisitsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const [kpi, trend, visits] = await Promise.all([
    getVisitKpi(sp.from, sp.to),
    getVisitTrend(sp.from, sp.to, "day"),
    getPeriodVisits(sp.from, sp.to),
  ]);

  const exportFn = exportVisitData.bind(null, sp.from, sp.to);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Báo cáo lượt khám</h1>
          <p className="text-sm text-stone-500">Thống kê bệnh nhân và lượt khám</p>
        </div>
        <ReportExportButton filename="bao-cao-luot-kham" getData={exportFn} />
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chi tiết lượt khám trong kỳ ({visits.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Ngày khám</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Bệnh nhân</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Bác sĩ khám</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Chẩn đoán</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v, i) => (
                  <tr key={i} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="whitespace-nowrap px-4 py-2.5 text-stone-600">
                      {new Date(v.visited_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{v.patient_name}</td>
                    <td className="px-4 py-2.5">{v.practitioner_name ?? "—"}</td>
                    <td className="max-w-xs truncate px-4 py-2.5 text-stone-600">{v.diagnosis ?? "—"}</td>
                  </tr>
                ))}
                {visits.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-stone-500">Chưa có lượt khám nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
