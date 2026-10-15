import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Pencil } from "lucide-react";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { ClinicalCaseFilterToolbar } from "./ClinicalCaseFilterToolbar";
import { PageSizeSelect } from "../visits/PageSizeSelect";

const PAGE_SIZES = [10, 25, 50];

export default async function ClinicalCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; size?: string }>;
}) {
  await requireRole("admin", "practitioner", "dispenser");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const pageSize = PAGE_SIZES.includes(Number(sp.size)) ? Number(sp.size) : 10;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: string[] = [];
  const params: unknown[] = [];
  if (q) {
    where.push(`(c.disease_name ILIKE $1 OR c.pattern ILIKE $1 OR c.treatment_principle ILIKE $1 OR t.name ILIKE $1)`);
    params.push(`%${q}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRes = await db.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM clinical_cases c
     LEFT JOIN prescription_templates t ON t.id = c.template_id
     ${whereSql}`,
    params,
  );
  const total = countRes.rows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const { rows } = await db.query<{
    id: string;
    disease_name: string;
    pattern: string | null;
    treatment_principle: string | null;
    template_id: string | null;
    template_name: string | null;
    is_active: boolean;
  }>(
    `SELECT c.id, c.disease_name, c.pattern, c.treatment_principle,
            c.template_id, t.name AS template_name, c.is_active
     FROM clinical_cases c
     LEFT JOIN prescription_templates t ON t.id = c.template_id
     ${whereSql}
     ORDER BY c.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, offset],
  );

  const buildHref = (overrides: Record<string, string>) => {
    const next: Record<string, string> = {
      q,
      page: String(safePage),
      size: String(pageSize),
      ...overrides,
    };
    const all = Object.entries(next).filter(([k, v]) => v && !(k === "q" && v === ""));
    return all.length
      ? `/clinical-cases?${all.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`
      : "/clinical-cases";
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
              Bệnh án kinh nghiệm
            </h1>
            <p className="text-sm text-stone-500">{total} bệnh án</p>
          </div>
          <Link href="/clinical-cases/new">
            <Button className="bg-emerald-800 hover:bg-emerald-900">
              <Plus className="mr-1 h-4 w-4" /> Thêm bệnh án
            </Button>
          </Link>
        </div>

        <ClinicalCaseFilterToolbar initialQ={q} />

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-stone-500">
              Không tìm thấy bệnh án nào.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-start justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <Link
                      href={`/clinical-cases/${c.id}`}
                      className="font-semibold text-stone-900 hover:text-emerald-800 hover:underline"
                    >
                      {c.disease_name}
                    </Link>
                    {c.pattern && (
                      <p className="mt-1 text-sm text-stone-500">
                        Biện chứng: {c.pattern}
                      </p>
                    )}
                    {c.treatment_principle && (
                      <p className="text-sm text-stone-500">
                        Pháp trị: {c.treatment_principle}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {c.template_name && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-800">
                          Bài thuốc: {c.template_name}
                        </Badge>
                      )}
                      {!c.is_active && <Badge variant="secondary">Ngưng</Badge>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Tooltip label="Xem chi tiết">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/clinical-cases/${c.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </Tooltip>
                    <Tooltip label="Sửa">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/clinical-cases/${c.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PageSizeSelect value={pageSize} options={PAGE_SIZES} basePath="/clinical-cases" />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={safePage <= 1} asChild={safePage > 1}>
                <Link href={buildHref({ page: String(safePage - 1) })}>← Trước</Link>
              </Button>
              <span className="text-sm text-stone-500">
                Trang {safePage} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={safePage >= totalPages} asChild={safePage < totalPages}>
                <Link href={buildHref({ page: String(safePage + 1) })}>Sau →</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
