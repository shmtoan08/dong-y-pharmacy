export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Phone } from "lucide-react";
import { listSuppliers } from "@/features/suppliers/actions";
import { getSessionUser } from "@/lib/auth";
import { ToggleSupplierButton } from "./ToggleSupplierButton";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

export default async function SuppliersPage() {
  const [suppliers, user] = await Promise.all([listSuppliers(), getSessionUser()]);
  const canEdit = user?.role === "admin" || user?.role === "practitioner";

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
              Nhà cung cấp
            </h1>
            <p className="text-sm text-stone-500">
              {suppliers.length} nhà cung cấp
            </p>
          </div>
          {canEdit && (
            <Link href="/suppliers/new">
              <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900">
                <Plus className="mr-1 h-4 w-4" /> Thêm NCC
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
                    <th className="px-4 py-2.5 font-medium text-stone-600">Mã NCC</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Tên</th>
                    <th className="hidden px-4 py-2.5 font-medium text-stone-600 md:table-cell">SĐT</th>
                    <th className="hidden px-4 py-2.5 font-medium text-stone-600 lg:table-cell">Địa chỉ</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Trạng thái</th>
                    {canEdit && <th className="px-4 py-2.5 text-right font-medium text-stone-600">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-2.5 font-mono text-xs">{s.code}</td>
                      <td className="px-4 py-2.5 font-medium">{s.name}</td>
                      <td className="hidden px-4 py-2.5 md:table-cell">
                        {s.phone ? (
                          <span className="inline-flex items-center gap-1 text-stone-600">
                            <Phone className="h-3 w-3" /> {s.phone}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="hidden max-w-xs truncate px-4 py-2.5 text-stone-600 lg:table-cell">
                        {s.address ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge className={s.is_active ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"}>
                          {s.is_active ? "Đang hợp tác" : "Ngừng"}
                        </Badge>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1">
                            <Tooltip label="Chỉnh sửa">
                              <Link href={`/suppliers/${s.id}/edit`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>
                            </Tooltip>
                            <ToggleSupplierButton id={s.id} isActive={s.is_active} />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {suppliers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-500">
                        Chưa có nhà cung cấp nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
