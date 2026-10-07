export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Eye } from "lucide-react";
import { listSuppliers } from "@/features/suppliers/actions";
import { getSessionUser } from "@/lib/auth";
import { ToggleSupplierButton } from "./ToggleSupplierButton";
import { SupplierFilterToolbar } from "./SupplierFilterToolbar";
import { PageSizeSelect } from "../visits/PageSizeSelect";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

const PAGE_SIZE = 10;

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; pageSize?: string }>;
}) {
  const sp = await searchParams;
  const [suppliers, user] = await Promise.all([listSuppliers(), getSessionUser()]);
  const canEdit = user?.role === "admin" || user?.role === "practitioner";

  const q = (sp.q ?? "").toLowerCase().trim();
  const status = sp.status ?? "all";
  const pageSize = Math.min(Math.max(Number(sp.pageSize) || PAGE_SIZE, 5), 50);

  let filtered = suppliers;
  if (q) {
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.phone ?? "").includes(q) ||
        (s.contact_name ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q),
    );
  }
  if (status === "active") filtered = filtered.filter((s) => s.is_active);
  else if (status === "inactive") filtered = filtered.filter((s) => !s.is_active);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(Number(sp.page) || 1, 1), totalPages);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

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
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
              Nhà cung cấp
            </h1>
            <p className="text-sm text-stone-500">
              {total} nhà cung cấp
            </p>
          </div>
          {canEdit && (
            <Link href="/suppliers/new">
              <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900">
                <Plus className="mr-1 h-4 w-4" /> Thêm nhà cung cấp
              </Button>
            </Link>
          )}
        </div>

        <SupplierFilterToolbar />

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left">
                    <th className="px-4 py-2.5 font-medium text-stone-600">Mã NCC</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Nhà cung cấp</th>
                    <th className="hidden px-4 py-2.5 font-medium text-stone-600 md:table-cell">Người liên hệ</th>
                    <th className="hidden px-4 py-2.5 font-medium text-stone-600 lg:table-cell">Địa chỉ</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Trạng thái</th>
                    <th className="px-4 py-2.5 text-right font-medium text-stone-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-2.5 font-mono text-xs">{s.code}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/suppliers/${s.id}`} className="font-medium hover:text-emerald-700 hover:underline">
                          {s.name}
                        </Link>
                        {s.tax_code && (
                          <p className="text-xs text-stone-500">MST: {s.tax_code}</p>
                        )}
                        {s.email && (
                          <p className="text-xs text-stone-500">{s.email}</p>
                        )}
                      </td>
                      <td className="hidden px-4 py-2.5 md:table-cell">
                        {s.contact_name ? (
                          <>
                            <p>{s.contact_name}</p>
                            <p className="text-xs text-stone-500">
                              {[s.contact_title, s.phone].filter(Boolean).join(" · ")}
                            </p>
                          </>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="hidden max-w-xs truncate px-4 py-2.5 text-stone-600 lg:table-cell">
                        {s.address ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge className={s.is_active ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"}>
                          {s.is_active ? "Đang hợp tác" : "Tạm ngưng"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Tooltip label="Xem chi tiết">
                            <Link href={`/suppliers/${s.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </Tooltip>
                          {canEdit && (
                            <>
                              <Tooltip label="Chỉnh sửa">
                                <Link href={`/suppliers/${s.id}/edit`}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </Tooltip>
                              <ToggleSupplierButton id={s.id} isActive={s.is_active} />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-500">
                        Không tìm thấy nhà cung cấp nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Chân bảng: thống kê + phân trang */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-4 py-3">
              <p className="text-sm text-stone-500">
                Hiển thị {total === 0 ? 0 : (page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, total)} trên {total} nhà cung cấp
              </p>
              <div className="flex items-center gap-3">
                <PageSizeSelect value={pageSize} options={[10, 25, 50]} basePath="/suppliers" />
                <div className="flex items-center gap-1">
                  <Link href={pageHref(page - 1)}>
                    <Button variant="outline" size="sm" disabled={page <= 1} className="h-8 w-8 p-0">
                      {"<"}
                    </Button>
                  </Link>
                  <span className="px-2 text-sm text-stone-600">
                    {page} / {totalPages}
                  </span>
                  <Link href={pageHref(page + 1)}>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} className="h-8 w-8 p-0">
                      {">"}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
