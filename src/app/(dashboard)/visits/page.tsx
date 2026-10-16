import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getVisitsList } from "@/features/visits/queries";

export const metadata: Metadata = {
  title: "Khám bệnh & Bệnh án",
};
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewVisitDialog } from "./NewVisitDialog";
import { PageSizeSelect } from "./PageSizeSelect";
import { VisitFilterToolbar } from "./VisitFilterToolbar";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { Eye, Pill, Printer } from "lucide-react";

const PAGE_SIZES = [10, 25, 50];

function ageGender(dob: string | null, sex: string | null): string {
  const sexLabel = sex ? SEX_LABEL[sex] ?? sex : null;
  if (!dob) return sexLabel ?? "—";
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  const ageStr = age >= 0 ? `${age} tuổi` : null;
  return [ageStr, sexLabel].filter(Boolean).join(" / ") || "—";
}

const SEX_LABEL: Record<string, string> = { male: "Nam", female: "Nữ", other: "Khác" };

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; date?: string; status?: string; page?: string; size?: string }>;
}) {
  await requireRole("admin", "practitioner");

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const dateFilter = sp.date ?? "all";
  const statusFilter = sp.status ?? "all";
  const { rows, total, totalPages, safePage, offset, pageSize } =
    await getVisitsList({
      q: sp.q,
      date: sp.date,
      status: sp.status,
      page: sp.page ? Number(sp.page) : undefined,
      pageSize: sp.size ? Number(sp.size) : undefined,
    });

  const buildHref = (overrides: Record<string, string>) => {
    const next = { q, date: dateFilter, status: statusFilter, page: String(safePage), size: String(pageSize), ...overrides };
    // Giữ date/status=all để filter rõ ràng
    const all = Object.entries({ q: next.q, date: next.date, status: next.status, page: next.page, size: next.size })
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
    return `/visits?${all.join("&")}`;
  };

  return (
    <TooltipProvider>
    <div className="space-y-4">
      {/* Header + CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Lượt khám & Bệnh án</h1>
          <p className="text-sm text-stone-500">
            {total} lượt khám
          </p>
        </div>
        <NewVisitDialog />
      </div>

      {/* Toolbar lọc tự động */}
      <VisitFilterToolbar initialQ={q} initialDate={dateFilter} initialStatus={statusFilter} />

      {/* Bảng desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-stone-500">Không tìm thấy lượt khám nào.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold uppercase text-stone-500">
                  <th className="px-4 py-3">Mã BN</th>
                  <th className="px-4 py-3">Bệnh nhân</th>
                  <th className="px-4 py-3">Tuổi / Giới tính</th>
                  <th className="px-4 py-3">Chẩn đoán</th>
                  <th className="px-4 py-3">Ngày khám</th>
                  <th className="px-4 py-3 text-right">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((v) => (
                  <tr key={v.id} className="hover:bg-stone-50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-stone-500">
                      {v.patient_code}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/patients/${v.patient_id}`} className="font-medium text-stone-900 hover:text-emerald-700 hover:underline">
                        {v.full_name}
                      </Link>
                      {v.phone && <p className="text-xs text-stone-500">{v.phone}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                      {ageGender(v.date_of_birth, v.sex)}
                    </td>
                    <td className="max-w-48 truncate px-4 py-3 text-stone-600">
                      {v.final_diagnosis ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                      {new Date(v.visited_at).toLocaleDateString("vi-VN", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {v.prescription_id ? (
                        <Link href={`/prescriptions/${v.prescription_id}`}>
                          <Badge variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                            {v.prescription_code}
                          </Badge>
                        </Link>
                      ) : (
                        <Badge variant="secondary">Chưa kê đơn</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Tooltip label="Xem bệnh án">
                          <Link href={`/patients/${v.patient_id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 hover:text-emerald-700">
                            <Eye className="h-4 w-4" />
                          </Button>
                          </Link>
                        </Tooltip>
                        {!v.prescription_id ? (
                          <Tooltip label="Kê đơn thuốc">
                            <Link href={`/prescriptions/new?visitId=${v.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 hover:text-emerald-700">
                              <Pill className="h-4 w-4" />
                            </Button>
                            </Link>
                          </Tooltip>
                        ) : (
                          <Tooltip label="In đơn thuốc">
                            <Link href={`/prescriptions/${v.prescription_id}/print`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 hover:text-emerald-700">
                              <Printer className="h-4 w-4" />
                            </Button>
                            </Link>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Cards mobile */}
      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">Không tìm thấy lượt khám nào.</p>
        ) : (
          rows.map((v) => (
              <Card key={v.id} className="transition-shadow hover:shadow-md">
                <CardContent className="space-y-1.5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-stone-900">
                      {v.full_name}
                      <span className="ml-2 font-mono text-xs font-normal text-stone-500">
                        {v.patient_code}
                      </span>
                    </p>
                    {v.prescription_id ? (
                      <Badge variant="outline" className="shrink-0 border-emerald-300 text-emerald-700">
                        {v.prescription_code}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">Chưa kê đơn</Badge>
                    )}
                  </div>
                  <p className="text-xs text-stone-500">
                    {ageGender(v.date_of_birth, v.sex)}
                    {v.phone ? ` · ${v.phone}` : ""}
                  </p>
                  {v.final_diagnosis && (
                    <p className="truncate text-sm text-stone-700">{v.final_diagnosis}</p>
                  )}
                  <p className="text-xs text-stone-400">
                    {new Date(v.visited_at).toLocaleDateString("vi-VN", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Link href={`/patients/${v.patient_id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-1 h-3.5 w-3.5" /> Bệnh án
                      </Button>
                    </Link>
                    {!v.prescription_id ? (
                      <Link href={`/prescriptions/new?visitId=${v.id}`}>
                        <Button variant="outline" size="sm" className="text-emerald-700">
                          <Pill className="mr-1 h-3.5 w-3.5" /> Kê đơn
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/prescriptions/${v.prescription_id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-1 h-3.5 w-3.5" /> Xem đơn
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
          ))
        )}
      </div>

      {/* Chân bảng: hien thi + phan trang + chon so dong */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-stone-500">
        <p>
          {total === 0
            ? "Không có lượt khám nào"
            : `Hiển thị ${offset + 1}–${Math.min(offset + pageSize, total)} trên ${total} lượt khám`}
        </p>
        <div className="flex items-center gap-3">
          <PageSizeSelect value={pageSize} options={PAGE_SIZES} />
          <div className="flex gap-1">
            <Link href={buildHref({ page: String(safePage - 1) })}>
              <Button variant="outline" size="sm" disabled={safePage <= 1}>‹</Button>
            </Link>
            <span className="flex items-center px-2 font-medium text-stone-900">
              {safePage} / {totalPages}
            </span>
            <Link href={buildHref({ page: String(safePage + 1) })}>
              <Button variant="outline" size="sm" disabled={safePage >= totalPages}>›</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
