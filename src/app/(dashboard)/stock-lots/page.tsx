export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listLots } from "@/features/inventory/actions";
import { LotFilterToolbar } from "./LotFilterToolbar";

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
  searchParams: Promise<{ expiry?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const expiry = (sp.expiry as "expired" | "expiring" | "valid" | "no_expiry" | undefined) ?? undefined;
  const lots = await listLots({ expiry });

  const q = (sp.q ?? "").toLowerCase();
  const filtered = q
    ? lots.filter(
        (l) =>
          l.herb_name.toLowerCase().includes(q) ||
          l.lot_code.toLowerCase().includes(q) ||
          l.herb_code.toLowerCase().includes(q),
      )
    : lots;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Quản lý lô hàng</h1>
        <p className="text-sm text-stone-500">{filtered.length} lô</p>
      </div>

      <LotFilterToolbar />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Danh sách lô</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-stone-600">Mã lô</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Vị thuốc</th>
                  <th className="hidden px-4 py-2.5 font-medium text-stone-600 md:table-cell">NCC</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Tồn lô</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Hạn sử dụng</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const badge = expiryBadge(l.expiry_date);
                  return (
                    <tr key={l.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-2.5 font-mono text-xs font-medium">{l.lot_code}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{l.herb_name}</p>
                        <p className="font-mono text-xs text-stone-500">{l.herb_code}</p>
                      </td>
                      <td className="hidden px-4 py-2.5 text-stone-600 md:table-cell">
                        {l.supplier_name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {Number(l.quantity_current).toLocaleString("vi-VN")} {l.base_unit}
                        <p className="text-xs text-stone-400">
                          / {Number(l.quantity_initial).toLocaleString("vi-VN")} nhập
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge className={badge.cls}>{badge.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-stone-500">
                      Chưa có lô hàng nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
