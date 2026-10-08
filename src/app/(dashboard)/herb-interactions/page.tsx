export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { listInteractions } from "@/features/prescriptions/actions";
import { getSessionUser } from "@/lib/auth";
import { InteractionActions } from "./InteractionActions";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

const SEVERITY: Record<string, { label: string; cls: string }> = {
  cam_ky: { label: "Cấm kỵ", cls: "bg-red-100 text-red-800" },
  can_trong: { label: "Cẩn trọng", cls: "bg-amber-100 text-amber-800" },
};

export default async function InteractionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; severity?: string; verified?: string }>;
}) {
  const sp = await searchParams;
  const [rows, user] = await Promise.all([
    listInteractions({
      q: sp.q || undefined,
      severity: sp.severity || undefined,
      verified: sp.verified || undefined,
    }),
    getSessionUser(),
  ]);
  const canManage = user && (user.role === "admin" || user.role === "practitioner");

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Tương kỵ dược liệu</h1>
            <p className="text-sm text-stone-500">{rows.length} cặp</p>
          </div>
          {canManage && (
            <Link href="/herb-interactions/new">
              <Button className="bg-emerald-800 hover:bg-emerald-900">
                <Plus className="mr-1 h-4 w-4" /> Thêm cặp tương kỵ
              </Button>
            </Link>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left">
                    <th className="px-4 py-2.5 font-medium text-stone-600">Cặp vị thuốc</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Mức độ</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Mô tả</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Kiểm duyệt</th>
                    {canManage && <th className="px-4 py-2.5 text-right font-medium text-stone-600">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const sev = SEVERITY[r.severity];
                    return (
                      <tr key={r.id} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{r.herb_a_name} <span className="text-red-600">⛔</span> {r.herb_b_name}</p>
                          <p className="font-mono text-xs text-stone-500">{r.herb_a_code} · {r.herb_b_code}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge className={sev.cls}>{sev.label}</Badge>
                        </td>
                        <td className="max-w-xs px-4 py-2.5 text-stone-600">
                          <p className="truncate">{r.description ?? "—"}</p>
                          {r.source && <p className="text-xs text-stone-400">Nguồn: {r.source}</p>}
                        </td>
                        <td className="px-4 py-2.5">
                          {r.verified ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" /> Đã duyệt
                              {r.verified_by_name && <span className="text-stone-500">bởi {r.verified_by_name}</span>}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-stone-500">
                              <XCircle className="h-4 w-4" /> Chưa duyệt
                            </span>
                          )}
                        </td>
                        {canManage && (
                          <td className="px-4 py-2.5">
                            <InteractionActions
                              id={r.id}
                              verified={r.verified}
                              isAdmin={user.role === "admin"}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-stone-500">
                        Chưa có cặp tương kỵ nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-stone-500">
          Chỉ các cặp <span className="font-medium">đã kiểm duyệt</span> mới bật cảnh báo khi kê đơn.
        </p>
      </div>
    </TooltipProvider>
  );
}
