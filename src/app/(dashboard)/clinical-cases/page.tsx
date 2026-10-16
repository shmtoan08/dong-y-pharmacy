import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  getClinicalCasesList,
  getDiseases,
} from "@/features/clinical-cases/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Pencil } from "lucide-react";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { ClinicalCaseFilterToolbar } from "./ClinicalCaseFilterToolbar";
import { DeleteClinicalCaseButton } from "./DeleteClinicalCaseButton";
import { PageSizeSelect } from "../visits/PageSizeSelect";

const PAGE_SIZES = [10, 25, 50];

export default async function ClinicalCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; disease?: string; page?: string; size?: string }>;
}) {
  await requireRole("admin", "practitioner", "dispenser");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const diseaseFilter = sp.disease ?? "";

  const [diseases, { rows, total, totalPages, safePage, pageSize, grouped }] =
    await Promise.all([
      getDiseases(),
      getClinicalCasesList({
        q: sp.q,
        disease: sp.disease,
        page: sp.page ? Number(sp.page) : undefined,
        pageSize: sp.size ? Number(sp.size) : undefined,
      }),
    ]);

  const buildHref = (overrides: Record<string, string>) => {
    const next: Record<string, string> = {
      q,
      disease: diseaseFilter,
      page: String(safePage),
      size: String(pageSize),
      ...overrides,
    };
    const all = Object.entries(next).filter(
      ([k, v]) => v && !(k === "q" && v === "") && !(k === "disease" && v === ""),
    );
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
            <p className="text-sm text-stone-500">{total} biện chứng · {diseases.length} bệnh</p>
          </div>
          <Link href="/clinical-cases/new">
            <Button className="bg-emerald-800 hover:bg-emerald-900">
              <Plus className="mr-1 h-4 w-4" /> Thêm bệnh án
            </Button>
          </Link>
        </div>

        <ClinicalCaseFilterToolbar initialQ={q} diseases={diseases} initialDisease={diseaseFilter} />

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-stone-500">
              Không tìm thấy bệnh án nào.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {[...grouped.values()].map((g) => (
              <div key={g.disease_id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-emerald-900">{g.disease_name}</h2>
                  <Link href={`/clinical-cases/new?disease=${g.disease_id}`}>
                    <Button variant="outline" size="sm">
                      <Plus className="mr-1 h-4 w-4" /> Thêm biện chứng
                    </Button>
                  </Link>
                </div>
                {g.cases.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="flex items-start justify-between gap-3 py-4">
                      <div className="min-w-0">
                        <Link
                          href={`/clinical-cases/${c.id}`}
                          className="font-semibold text-stone-900 hover:text-emerald-800 hover:underline"
                        >
                          {c.pattern ?? "(Chưa có biện chứng)"}
                        </Link>
                        {c.treatment_principle && (
                          <p className="mt-1 text-sm text-stone-500">
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
                        <DeleteClinicalCaseButton
                          caseId={c.id}
                          patternName={c.pattern ?? "(Chưa có tên)"}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
