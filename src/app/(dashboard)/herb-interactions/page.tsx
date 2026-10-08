export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Pencil, Printer } from "lucide-react";
import {
  listInteractions,
} from "@/features/prescriptions/actions";
import { CATEGORY_LABEL, CONTRA_LABEL } from "@/features/prescriptions/interactionConstants";
import type { InteractionCategory } from "@/features/prescriptions/interactionConstants";
import { getSessionUser } from "@/lib/auth";
import { InteractionActions } from "./InteractionActions";
import { InteractionQuickView } from "./InteractionQuickView";
import { InteractionFilterToolbar } from "./InteractionFilterToolbar";
import { PageSizeSelect } from "../visits/PageSizeSelect";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

const PAGE_SIZE = 10;

const SEVERITY: Record<string, { label: string; cls: string }> = {
  cam_ky: { label: "Cấm kỵ", cls: "bg-red-100 text-red-800" },
  can_trong: { label: "Cẩn trọng", cls: "bg-amber-100 text-amber-800" },
};

export default async function InteractionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; severity?: string; category?: string; verified?: string; page?: string; pageSize?: string }>;
}) {
  const sp = await searchParams;
  const [rows, user] = await Promise.all([
    listInteractions({
      q: sp.q || undefined,
      severity: sp.severity || undefined,
      category: sp.category || undefined,
      verified: sp.verified || undefined,
    }),
    getSessionUser(),
  ]);
  const canManage = user && (user.role === "admin" || user.role === "practitioner");

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

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Tương kỵ dược liệu</h1>
            <p className="text-sm text-stone-500">{total} quy tắc</p>
          </div>
          {canManage && (
            <Link href="/herb-interactions/new">
              <Button className="bg-emerald-800 hover:bg-emerald-900">
                <Plus className="mr-1 h-4 w-4" /> Thêm cặp tương kỵ
              </Button>
            </Link>
          )}
        </div>

        <InteractionFilterToolbar />

        {/* Desktop */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left">
                    <th className="px-4 py-2.5 font-medium text-stone-600">Cặp vị thuốc</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Phân loại YHCT</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Mức độ</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Hậu quả / Triệu chứng</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Duyệt</th>
                    <th className="px-4 py-2.5 text-right font-medium text-stone-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => {
                    const sev = SEVERITY[r.severity];
                    return (
                      <tr key={r.id} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium">
                            {r.herb_a_name} <span className="text-red-600">⛔</span> {r.herb_b_name}
                          </p>
                          <p className="font-mono text-xs text-stone-500">{r.herb_a_code} · {r.herb_b_code}</p>
                          {r.contraindicated_for.length > 0 && (
                            <p className="text-xs text-stone-500">
                              Kỵ: {r.contraindicated_for.map((k) => CONTRA_LABEL[k] ?? k).join(", ")}
                            </p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-stone-600">
                          {CATEGORY_LABEL[r.category as InteractionCategory] ?? r.category}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge className={sev.cls}>{sev.label}</Badge>
                        </td>
                        <td className="max-w-xs px-4 py-2.5 text-stone-600">
                          <p className="line-clamp-2">{r.symptoms ?? r.description ?? "—"}</p>
                          {r.antidote && (
                            <p className="text-xs text-emerald-700">Giải độc: {r.antidote}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {r.verified ? (
                            <Badge className="bg-emerald-100 text-emerald-800">Đã duyệt</Badge>
                          ) : (
                            <Badge className="bg-stone-200 text-stone-600">Chưa duyệt</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1">
                            <InteractionQuickView row={r} />
                            {canManage && (
                              <Tooltip label="Sửa">
                                <Link href={`/herb-interactions/${r.id}/edit`}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </Tooltip>
                            )}
                            {canManage && (
                              <InteractionActions
                                id={r.id}
                                verified={r.verified}
                                isAdmin={user.role === "admin"}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-500">
                        Không tìm thấy quy tắc nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-4 py-3">
              <p className="text-sm text-stone-500">
                Hiển thị {total === 0 ? 0 : (page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, total)} trên {total} quy tắc
              </p>
              <div className="flex items-center gap-3">
                <PageSizeSelect value={pageSize} options={[10, 25, 50]} basePath="/herb-interactions" />
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

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {pageRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-500">Không tìm thấy quy tắc nào.</p>
          ) : (
            pageRows.map((r) => {
              const sev = SEVERITY[r.severity];
              return (
                <Card key={r.id}>
                  <CardContent className="space-y-1.5 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{r.herb_a_name} ⛔ {r.herb_b_name}</p>
                      <Badge className={sev.cls}>{sev.label}</Badge>
                    </div>
                    <p className="text-xs text-stone-500">
                      {CATEGORY_LABEL[r.category as InteractionCategory]} ·{" "}
                      {r.verified ? "Đã duyệt" : "Chưa duyệt"}
                    </p>
                    {r.symptoms && <p className="text-sm text-stone-600">{r.symptoms}</p>}
                    {canManage && (
                      <div className="flex justify-end gap-1 border-t border-stone-100 pt-2">
                        <InteractionQuickView row={r} />
                        <Tooltip label="Sửa">
                          <Link href={`/herb-interactions/${r.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                        </Tooltip>
                        <InteractionActions id={r.id} verified={r.verified} isAdmin={user.role === "admin"} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <p className="text-xs text-stone-500">
          Chỉ các cặp <span className="font-medium">đã kiểm duyệt</span> mới bật cảnh báo khi kê đơn.
        </p>
      </div>
    </TooltipProvider>
  );
}
