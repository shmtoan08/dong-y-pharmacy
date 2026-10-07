import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Stethoscope, Pencil } from "lucide-react";
import { PatientFilterToolbar } from "./PatientFilterToolbar";
import { ExportPatientsButton } from "./ExportPatientsButton";
import { PageSizeSelect } from "../visits/PageSizeSelect";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

const PAGE_SIZES = [10, 25, 50];

const SEX_LABEL: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

function ageGender(dob: string | null, sex: string | null): string {
  const sexLabel = sex ? (SEX_LABEL[sex] ?? sex) : null;
  if (!dob) return sexLabel ?? "—";
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  const ageStr = age >= 0 ? `${age} tuổi` : null;
  return [ageStr, sexLabel].filter(Boolean).join(" / ") || "—";
}

type PatientRow = {
  id: string;
  patient_code: string;
  full_name: string;
  phone: string | null;
  sex: string | null;
  date_of_birth: string | null;
  address: string | null;
  visit_count: number;
  last_visit: string | null;
};

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sex?: string;
    visit?: string;
    page?: string;
    size?: string;
  }>;
}) {
  await requireRole("admin", "practitioner", "dispenser");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const sexFilter = ["male", "female", "other"].includes(sp.sex ?? "")
    ? sp.sex!
    : "all";
  const visitFilter = ["month", "stale", "never"].includes(sp.visit ?? "")
    ? sp.visit!
    : "all";
  const pageSize = PAGE_SIZES.includes(Number(sp.size)) ? Number(sp.size) : 10;
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (q) {
    where.push(`(p.full_name ILIKE $${i} OR p.phone ILIKE $${i} OR p.patient_code ILIKE $${i} OR p.address ILIKE $${i})`);
    params.push(`%${q}%`);
    i++;
  }
  if (sexFilter !== "all") {
    where.push(`p.sex = $${i}`);
    params.push(sexFilter);
    i++;
  }
  if (visitFilter === "month") {
    where.push(`vs.last_visit >= date_trunc('month', now())`);
  } else if (visitFilter === "stale") {
    where.push(`vs.last_visit IS NOT NULL AND vs.last_visit < now() - interval '6 months'`);
  } else if (visitFilter === "never") {
    where.push(`vs.last_visit IS NULL`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countSql = `
    SELECT COUNT(*)::int AS total FROM patients p
    LEFT JOIN (SELECT patient_id, COUNT(*) AS cnt, MAX(visited_at) AS last_visit FROM visits GROUP BY patient_id) vs
      ON vs.patient_id = p.id
    ${whereSql}`;
  const countRes = await db.query<{ total: number }>(countSql, params);
  const total = countRes.rows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const safeOffset = (safePage - 1) * pageSize;

  const dataSql = `
    SELECT p.id, p.patient_code, p.full_name, p.phone, p.sex, p.date_of_birth, p.address,
           COALESCE(vs.cnt, 0)::int AS visit_count, vs.last_visit
    FROM patients p
    LEFT JOIN (SELECT patient_id, COUNT(*) AS cnt, MAX(visited_at) AS last_visit FROM visits GROUP BY patient_id) vs
      ON vs.patient_id = p.id
    ${whereSql}
    ORDER BY p.created_at DESC
    LIMIT $${i} OFFSET $${i + 1}`;
  const dataRes = await db.query<PatientRow>(dataSql, [...params, pageSize, safeOffset]);
  const rows = dataRes.rows;

  const buildHref = (overrides: Record<string, string>) => {
    const next: Record<string, string> = {
      q,
      sex: sexFilter,
      visit: visitFilter,
      page: String(safePage),
      size: String(pageSize),
      ...overrides,
    };
    const all = Object.entries(next).filter(
      ([k, v]) => v && !(k === "sex" && v === "all") && !(k === "visit" && v === "all"),
    );
    return all.length
      ? `/patients?${all.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`
      : "/patients";
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
              Hồ sơ bệnh nhân
            </h1>
            <p className="text-sm text-stone-500">{total} hồ sơ</p>
          </div>
          <div className="flex gap-2">
            <ExportPatientsButton />
            <Link href="/patients/new">
              <Button className="bg-emerald-800 hover:bg-emerald-900">
                <Plus className="mr-1 h-4 w-4" /> Thêm bệnh nhân
              </Button>
            </Link>
          </div>
        </div>

        {/* Toolbar lọc tự động */}
        <PatientFilterToolbar initialQ={q} initialSex={sexFilter} initialVisit={visitFilter} />

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-stone-500">
              {q || sexFilter !== "all" || visitFilter !== "all"
                ? "Không tìm thấy bệnh nhân phù hợp."
                : "Chưa có bệnh nhân nào."}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop: bảng */}
            <div className="hidden overflow-x-auto rounded-lg border border-stone-200 bg-white md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-500">
                    <th className="px-4 py-3">Mã BN</th>
                    <th className="px-4 py-3">Bệnh nhân</th>
                    <th className="px-4 py-3">Tuổi / Giới tính</th>
                    <th className="px-4 py-3">Địa chỉ</th>
                    <th className="px-4 py-3">Lần khám gần nhất</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-stone-100 transition-colors last:border-0 hover:bg-stone-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-stone-700">
                        {p.patient_code}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/patients/${p.id}`}
                          className="font-semibold text-stone-900 hover:text-emerald-700"
                        >
                          {p.full_name}
                        </Link>
                        {p.phone && (
                          <p className="text-xs text-stone-500">{p.phone}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                        {ageGender(p.date_of_birth, p.sex)}
                      </td>
                      <td className="max-w-48 truncate px-4 py-3 text-stone-600">
                        {p.address || <span className="text-stone-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                        {p.last_visit ? (
                          <>
                            {new Date(p.last_visit).toLocaleDateString("vi-VN")}
                            <span className="text-xs text-stone-400">
                              {" "}• {p.visit_count} lần khám
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-stone-400">Chưa khám</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Tooltip label="Xem hồ sơ & lịch sử bệnh án">
                            <Link href={`/patients/${p.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-stone-500 hover:text-emerald-700"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </Tooltip>
                          <Tooltip label="Khám mới cho bệnh nhân này">
                            <Link href={`/visits/new?patientId=${p.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-stone-500 hover:text-emerald-700"
                              >
                                <Stethoscope className="h-4 w-4" />
                              </Button>
                            </Link>
                          </Tooltip>
                          <Tooltip label="Chỉnh sửa thông tin">
                            <Link href={`/patients/${p.id}/edit`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-stone-500 hover:text-emerald-700"
                              >
                                <Pencil className="h-4 w-4" />
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
              {rows.map((p) => (
                <Card key={p.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-stone-900">
                          {p.full_name}
                        </p>
                        <p className="text-xs text-stone-500">
                          {p.patient_code}
                          {p.phone ? ` • ${p.phone}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-stone-500">
                        {ageGender(p.date_of_birth, p.sex)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">
                      {p.last_visit
                        ? `Khám gần nhất: ${new Date(p.last_visit).toLocaleDateString("vi-VN")} • ${p.visit_count} lần`
                        : "Chưa khám lần nào"}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Link href={`/patients/${p.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-1 h-3.5 w-3.5" /> Hồ sơ
                        </Button>
                      </Link>
                      <Link href={`/visits/new?patientId=${p.id}`}>
                        <Button variant="outline" size="sm" className="text-emerald-700">
                          <Stethoscope className="mr-1 h-3.5 w-3.5" /> Khám mới
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
                  ? "Không có bệnh nhân nào"
                  : `Hiển thị ${safeOffset + 1}–${Math.min(safeOffset + pageSize, total)} trên ${total} bệnh nhân`}
              </p>
              <div className="flex items-center gap-3">
                <PageSizeSelect value={pageSize} options={PAGE_SIZES} basePath="/patients" />
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
