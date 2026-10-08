export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLedger } from "@/features/finance/ledger";
import { ReportFilterBar } from "../../reports/ReportFilterBar";
import { PaginatedTable } from "../../reports/PaginatedTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const type = sp.type === "income" ? "income" : sp.type === "expense" ? "expense" : undefined;
  const { entries, summary } = await getLedger(sp.from, sp.to, type);

  const fmt = (n: number) => Number(n).toLocaleString("vi-VN") + "đ";
  const fmtSigned = (n: number) => (n >= 0 ? "+" : "") + fmt(n);

  const typeHref = (t?: string) => {
    const params = new URLSearchParams();
    if (sp.from) params.set("from", sp.from);
    if (sp.to) params.set("to", sp.to);
    if (t) params.set("type", t);
    return `?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Sổ quỹ</h1>
        <p className="text-sm text-stone-500">Thu chi tổng hợp từ hóa đơn và thanh toán NCC</p>
      </div>

      <ReportFilterBar basePath="/finance/ledger" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500">💰 Số dư đầu kỳ</p>
            <p className="mt-1 text-lg font-bold text-stone-900">{fmt(summary.opening_balance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500">📥 Tổng thu</p>
            <p className="mt-1 text-lg font-bold text-emerald-700">{fmt(summary.total_income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500">📤 Tổng chi</p>
            <p className="mt-1 text-lg font-bold text-red-700">{fmt(summary.total_expense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500">💵 Số dư cuối kỳ</p>
            <p className={`mt-1 text-lg font-bold ${summary.closing_balance >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {fmt(summary.closing_balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Link href={typeHref()}>
          <Button variant={!type ? "default" : "outline"} size="sm" className={!type ? "bg-emerald-800 hover:bg-emerald-900" : ""}>
            Tất cả
          </Button>
        </Link>
        <Link href={typeHref("income")}>
          <Button variant={type === "income" ? "default" : "outline"} size="sm" className={type === "income" ? "bg-emerald-800 hover:bg-emerald-900" : ""}>
            Thu
          </Button>
        </Link>
        <Link href={typeHref("expense")}>
          <Button variant={type === "expense" ? "default" : "outline"} size="sm" className={type === "expense" ? "bg-emerald-800 hover:bg-emerald-900" : ""}>
            Chi
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chi tiết thu chi ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PaginatedTable
            emptyText="Chưa có giao dịch nào."
            headers={
              <>
                <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Ngày giờ</th>
                <th className="px-4 py-2.5 font-medium text-stone-600">Diễn giải</th>
                <th className="px-4 py-2.5 font-medium text-stone-600">Loại</th>
                <th className="px-4 py-2.5 text-right font-medium text-stone-600">Thu</th>
                <th className="px-4 py-2.5 text-right font-medium text-stone-600">Chi</th>
                <th className="px-4 py-2.5 text-right font-medium text-stone-600">Số dư</th>
                <th className="px-4 py-2.5 font-medium text-stone-600">Người thực hiện</th>
              </>
            }
            bodyRows={entries.map((e) => (
              <tr key={e.id} className="border-b border-stone-100 hover:bg-stone-50">
                <td className="whitespace-nowrap px-4 py-2.5 text-stone-600">
                  {new Date(e.created_at).toLocaleString("vi-VN", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </td>
                <td className="px-4 py-2.5">{e.description}</td>
                <td className="px-4 py-2.5">
                  {e.income > 0 ? (
                    <Badge className="bg-emerald-100 text-emerald-800">Thu</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">Chi</Badge>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-emerald-700">
                  {e.income > 0 ? fmt(e.income) : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-red-700">
                  {e.expense > 0 ? fmt(e.expense) : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium">
                  {fmt(e.running_balance)}
                </td>
                <td className="px-4 py-2.5 text-stone-600">{e.user_name ?? "—"}</td>
              </tr>
            ))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
