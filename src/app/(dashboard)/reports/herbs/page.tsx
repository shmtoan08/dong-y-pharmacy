export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTopHerbUsage, getLowStockHerbs } from "@/features/reports/actions";
import { ReportFilterBar } from "../ReportFilterBar";
import { ReportExportButton } from "../ReportExportButton";

export default async function HerbsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const [usage, lowStock] = await Promise.all([
    getTopHerbUsage(sp.from, sp.to, 15),
    getLowStockHerbs(),
  ]);

  const fmtQty = (n: number, unit: string) =>
    `${Number(n).toLocaleString("vi-VN")}${unit ? " " + unit : ""}`;

  const exportFn = async () => {
    "use server";
    return {
      headers: ["Vị thuốc", "Đã xuất", "Tồn hiện tại", "Đơn vị"],
      rows: usage.map((u) => [
        u.herb_name,
        String(Math.round(u.dispensed_qty * 100) / 100),
        String(Math.round(u.current_stock * 100) / 100),
        u.unit,
      ]),
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Báo cáo tiêu hao dược liệu</h1>
          <p className="text-sm text-stone-500">Dựa trên thực tế xuất kho (FEFO)</p>
        </div>
        <ReportExportButton filename="bao-cao-tieu-hao" getData={exportFn} />
      </div>

      <ReportFilterBar basePath="/reports/herbs" />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top vị thuốc xuất nhiều nhất</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-stone-600">#</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Vị thuốc</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Đã xuất</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Tồn hiện tại</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u, i) => (
                  <tr key={u.herb_id ?? u.herb_name} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-2.5 text-stone-500">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium">{u.herb_name}</td>
                    <td className="px-4 py-2.5 text-right">{fmtQty(u.dispensed_qty, u.unit)}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${u.current_stock <= 0 ? "text-red-700" : ""}`}>
                      {fmtQty(u.current_stock, u.unit)}
                    </td>
                  </tr>
                ))}
                {usage.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-stone-500">Chưa có dữ liệu xuất kho.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Vị tồn thấp / sắp hết hạn</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Mã</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Vị thuốc</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Tồn</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Cảnh báo</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((h) => (
                  <tr key={h.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{h.code}</td>
                    <td className="px-4 py-2.5">{h.name_common}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${h.stock <= 0 ? "text-red-700" : ""}`}>
                      {fmtQty(h.stock, h.unit)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {h.stock <= 0 && <Badge className="bg-red-100 text-red-800">Hết hàng</Badge>}
                        {h.expiring_lots > 0 && (
                          <Badge className="bg-amber-100 text-amber-800">{h.expiring_lots} lô sắp hết hạn</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
