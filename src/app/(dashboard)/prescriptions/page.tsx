import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Printer } from "lucide-react";
import { STATUS_LABEL, STATUS_STYLE, type PrescriptionStatus } from "@/features/prescriptions/constants";
import { PrescriptionFilterToolbar } from "./PrescriptionFilterToolbar";
import { DispenseButton } from "./DispenseButton";
import { PageSizeSelect } from "../visits/PageSizeSelect";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

const PAGE_SIZES = [10, 25, 50];

const TABS: { value: string; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "draft", label: "Nháp" },
  { value: "confirmed", label: "Đã chốt · Chờ bốc" },
  { value: "completed", label: "Đã bốc thuốc" },
  { value: "cancelled", label: "Đã hủy" },
];

const VALID_STATUS = ["draft", "confirmed", "completed", "cancelled"];

type Row = {
  id: string;
  prescription_code: string;
  status: PrescriptionStatus;
  num_of_packs: number;
  full_name: string;
  patient_code: string;
  phone: string | null;
  practitioner_name: string | null;
  created_at: string;
};

export default async function PrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    date?: string;
    practitioner?: string;
    page?: string;
    size?: string;
  }>;
}) {
  await requireRole("admin", "practitioner", "dispenser");
  const sp = await searchParams;
  const status = VALID_STATUS.includes(sp.status ?? "") ? sp.status! : "";
  const q = (sp.q ?? "").trim();
  const dateFilter = ["today", "week"].includes(sp.date ?? "") ? sp.date! : "all";
  const practitionerFilter = sp.practitioner ?? "all";
  const pageSize = PAGE_SIZES.includes(Number(sp.size)) ? Number(sp.size) : 10;
  const page = Math.max(1, Number(sp.page) || 1);

  // Đếm số lượng từng tab
  const countRes = await db.query<{ status: string; cnt: string }>(
    `SELECT status, COUNT(*)::text AS cnt FROM prescriptions GROUP BY status`,
  );
  const counts: Record<string, number> = {};
  for (const r of countRes.rows) counts[r.status] = Number(r.cnt);
  const totalAll = Object.values(counts).reduce((a, b) => a + b, 0);

  // Danh sách bác sĩ cho bộ lọc
  const pracRes = await db.query<{ id: string; name: string }>(
    `SELECT u.id, u.full_name AS name
     FROM users u
     WHERE u.role = 'practitioner' AND u.is_active
     ORDER BY name`,
  );

  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (status) {
    where.push(`pr.status = $${i}`);
    params.push(status);
    i++;
  }
  if (q) {
    where.push(`(pr.prescription_code ILIKE $${i} OR p.full_name ILIKE $${i} OR p.phone ILIKE $${i})`);
    params.push(`%${q}%`);
    i++;
  }
  if (dateFilter === "today") {
    where.push(`pr.created_at >= date_trunc('day', now())`);
  } else if (dateFilter === "week") {
    where.push(`pr.created_at >= date_trunc('week', now())`);
  }
  if (practitionerFilter !== "all") {
    where.push(`pr.practitioner_id = $${i}`);
    params.push(practitionerFilter);
    i++;
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countFiltered = await db.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM prescriptions pr
     JOIN visits v ON v.id = pr.visit_id
     JOIN patients p ON p.id = v.patient_id
     ${whereSql}`,
    params,
  );
  const total = countFiltered.rows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const { rows } = await db.query<Row>(
    `SELECT pr.id, pr.prescription_code, pr.status, pr.num_of_packs,
            p.full_name, p.patient_code, p.phone, pr.created_at,
            u.full_name AS practitioner_name
     FROM prescriptions pr
     JOIN visits v ON v.id = pr.visit_id
     JOIN patients p ON p.id = v.patient_id
     JOIN users u ON u.id = pr.practitioner_id
     ${whereSql}
     ORDER BY pr.created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, pageSize, offset],
  );

  const buildHref = (overrides: Record<string, string>) => {
    const next: Record<string, string> = {
      status, q, date: dateFilter, practitioner: practitionerFilter,
      page: String(safePage), size: String(pageSize), ...overrides,
    };
    const all = Object.entries(next).filter(
      ([k, v]) =>
        v && !(k === "date" && v === "all") && !(k === "practitioner" && v === "all"),
    );
    return all.length
      ? `/prescriptions?${all.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`
      : "/prescriptions";
  };

  const tabHref = (value: string) =>
    value ? `/prescriptions?status=${value}` : "/prescriptions";

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
            Kê đơn & Bốc thuốc
          </h1>
          <p className="text-sm text-stone-500">
            Danh sách đơn thuốc & hàng đợi bốc thuốc
          </p>
        </div>

        {/* Tab trạng thái có số lượng */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const count = t.value === "" ? totalAll : (counts[t.value] ?? 0);
            const active = status === t.value;
            return (
              <Link key={t.value} href={tabHref(t.value)}>
                <Button
                  variant={active ? "default" : "outline"}
                  size="sm"
                  className={active ? "bg-emerald-800 hover:bg-emerald-900" : ""}
                >
                  {t.label}
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                      active ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {count}
                  </span>
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Toolbar lọc tự động */}
        <PrescriptionFilterToolbar
          initialQ={q}
          initialDate={dateFilter}
          initialPractitioner={practitionerFilter}
          practitioners={pracRes.rows}
        />

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-stone-500">
              Không có đơn thuốc nào.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop: bảng */}
            <div className="hidden overflow-x-auto rounded-lg border border-stone-200 bg-white md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-500">
                    <th className="px-4 py-3">Mã đơn</th>
                    <th className="px-4 py-3">Bệnh nhân</th>
                    <th className="px-4 py-3">Bác sĩ kê</th>
                    <th className="px-4 py-3">Ngày kê</th>
                    <th className="px-4 py-3 text-right">Số thang</th>
                    <th className="px-4 py-3 text-right">Tổng tiền</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-stone-100 transition-colors last:border-0 hover:bg-stone-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-stone-700">
                        {r.prescription_code}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-stone-900">{r.full_name}</p>
                        {r.phone && (
                          <p className="text-xs text-stone-500">
                            {r.patient_code} · {r.phone}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                        {r.practitioner_name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                        {new Date(r.created_at).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                        <span className="text-xs text-stone-400">
                          {" "}
                          {new Date(r.created_at).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-stone-600">
                        {r.num_of_packs} thang
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-stone-400">
                        —
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge className={STATUS_STYLE[r.status]}>
                          {STATUS_LABEL[r.status]}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {r.status === "confirmed" && (
                            <DispenseButton
                              prescriptionId={r.id}
                              prescriptionCode={r.prescription_code}
                            />
                          )}
                          <Tooltip label="In đơn thuốc">
                            <Link href={`/prescriptions/${r.id}/print`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-stone-500 hover:text-emerald-700"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </Link>
                          </Tooltip>
                          <Tooltip label="Xem chi tiết">
                            <Link href={`/prescriptions/${r.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-stone-500 hover:text-emerald-700"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <div className="grid gap-3 md:hidden">
              {rows.map((r) => (
                <Card key={r.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-900">
                          {r.prescription_code}
                        </p>
                        <p className="text-xs text-stone-500">
                          {r.full_name}
                          {r.phone ? ` · ${r.phone}` : ""}
                        </p>
                      </div>
                      <Badge className={`${STATUS_STYLE[r.status]} shrink-0`}>
                        {STATUS_LABEL[r.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-stone-500">
                      {r.num_of_packs} thang ·{" "}
                      {new Date(r.created_at).toLocaleDateString("vi-VN")}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Link href={`/prescriptions/${r.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-1 h-3.5 w-3.5" /> Chi tiết
                        </Button>
                      </Link>
                      <Link href={`/prescriptions/${r.id}/print`}>
                        <Button variant="outline" size="sm">
                          <Printer className="mr-1 h-3.5 w-3.5" /> In
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chân bảng */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-stone-500">
              <p>
                {total === 0
                  ? "Không có đơn thuốc nào"
                  : `Hiển thị ${offset + 1}–${Math.min(offset + pageSize, total)} trên ${total} đơn thuốc`}
              </p>
              <div className="flex items-center gap-3">
                <PageSizeSelect value={pageSize} options={PAGE_SIZES} basePath="/prescriptions" />
                <div className="flex gap-1">
                  <Link href={buildHref({ page: String(safePage - 1) })}>
                    <Button variant="outline" size="sm" disabled={safePage <= 1}>
                      ‹
                    </Button>
                  </Link>
                  <span className="flex items-center px-2 font-medium text-stone-900">
                    {safePage} / {totalPages}
                  </span>
                  <Link href={buildHref({ page: String(safePage + 1) })}>
                    <Button variant="outline" size="sm" disabled={safePage >= totalPages}>
                      ›
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
