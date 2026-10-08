export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { Printer } from "lucide-react";
import Link from "next/link";
import { getLedger } from "@/features/finance/ledger";
import { ReportFilterBar } from "../../reports/ReportFilterBar";
import { PaginatedTable } from "../../reports/PaginatedTable";
import { ManualTxButton } from "./ManualTxButton";
import { LedgerSearch } from "./LedgerSearch";
import { LedgerExportButton } from "./LedgerExportButton";
import { LedgerMethodFilter } from "./LedgerMethodFilter";

const METHOD_LABEL: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
};

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; type?: string; q?: string; method?: string }>;
}) {
  const sp = await searchParams;
  const type = sp.type === "income" ? "income" : sp.type === "expense" ? "expense" : undefined;
  const { entries, summary } = await getLedger(sp.from, sp.to, type, sp.q, sp.method);

  const fmt = (n: number) => Number(n).toLocaleString("vi-VN") + "đ";

  const typeHref = (t?: string) => {
    const params = new URLSearchParams();
    if (sp.from) params.set("from", sp.from);
    if (sp.to) params.set("to", sp.to);
    if (sp.q) params.set("q", sp.q);
    if (sp.method) params.set("method", sp.method);
    if (t) params.set("type", t);
    return `?${params.toString()}`;
  };

  const exportData = async () => {
    "use server";
    return {
      headers: ["Mã phiếu", "Ngày giờ", "Diễn giải", "Loại", "Thu", "Chi", "Số dư", "Quỹ", "Người thực hiện"],
      rows: entries.map((e) => [
        e.code,
        new Date(e.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
        e.description,
        e.income > 0 ? "Thu" : "Chi",
        String(Math.round(e.income)),
        String(Math.round(e.expense)),
        String(Math.round(e.running_balance)),
        METHOD_LABEL[e.method] ?? e.method,
        e.user_name ?? "",
      ]),
    };
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Sổ quỹ</h1>
            <p className="text-sm text-stone-500">Thu chi tổng hợp từ hóa đơn và thanh toán NCC</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LedgerExportButton getData={exportData} />
            <ManualTxButton type="expense" />
            <ManualTxButton type="income" />
          </div>
        </div>

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
              <p className="text-xs text-stone-500">🏦 Tồn quỹ</p>
              <p className={`mt-1 text-lg font-bold ${summary.closing_balance >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {fmt(summary.closing_balance)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <ReportFilterBar basePath="/finance/ledger" />
          <LedgerSearch />
          <LedgerMethodFilter />
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

        {/* Desktop table */}
        <Card className="hidden md:block">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Chi tiết thu chi ({entries.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PaginatedTable
              emptyText="Chưa có giao dịch nào."
              headers={
                <>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Mã phiếu</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Ngày giờ</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Diễn giải</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Thu</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Chi</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Số dư</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Quỹ</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Thao tác</th>
                </>
              }
              bodyRows={entries.map((e) => (
                <tr key={e.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs font-medium">{e.code}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-stone-600">
                    {new Date(e.created_at).toLocaleString("vi-VN", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </td>
                  <td className="px-4 py-2.5">
                    {e.description}
                    <span className="block text-xs text-stone-500">{e.user_name ?? ""}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-emerald-700">
                    {e.income > 0 ? fmt(e.income) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-red-700">
                    {e.expense > 0 ? fmt(e.expense) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium">
                    {fmt(e.running_balance)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <Badge variant="outline">{METHOD_LABEL[e.method] ?? e.method}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      {e.source === "manual" && (
                        <>
                          <Tooltip label="In phiếu">
                            <Link href={`/finance/ledger/print/${e.ref_id}`}>
                              <Button variant="ghost" size="icon" className="h-9 w-9">
                                <Printer className="h-4 w-4" />
                              </Button>
                            </Link>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            />
          </CardContent>
        </Card>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {entries.map((e) => (
            <Card key={e.id}>
              <CardContent className="space-y-1.5 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium">{e.code}</span>
                  <Badge variant="outline">{METHOD_LABEL[e.method] ?? e.method}</Badge>
                </div>
                <p className="text-xs text-stone-500">
                  {new Date(e.created_at).toLocaleString("vi-VN", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </p>
                <p className="text-sm">{e.description}</p>
                <p className="text-sm">
                  Số tiền:{" "}
                  <span className={`font-bold ${e.income > 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {e.income > 0 ? "+" : "-"}{fmt(e.income > 0 ? e.income : e.expense)}
                  </span>{" "}
                  <span className="text-stone-500">({e.income > 0 ? "Thu" : "Chi"})</span>
                </p>
                <p className="text-sm">
                  Số dư sau GD: <span className="font-medium">{fmt(e.running_balance)}</span>
                </p>
                <p className="text-xs text-stone-500">Người thực hiện: {e.user_name ?? "—"}</p>
                {e.source === "manual" && (
                  <div className="flex justify-end gap-2 border-t border-stone-100 pt-2">
                    <Link href={`/finance/ledger/print/${e.ref_id}`}>
                      <Button variant="outline" size="sm" className="h-10">
                        <Printer className="mr-1 h-4 w-4" /> In phiếu
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {entries.length === 0 && (
            <p className="py-6 text-center text-sm text-stone-500">Chưa có giao dịch nào.</p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

