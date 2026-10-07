import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Pencil } from "lucide-react";
import { CATEGORY_LABEL } from "@/features/formulas/schemas";
import { FormulaFilterToolbar } from "./FormulaFilterToolbar";
import { DuplicateFormulaButton } from "./DuplicateFormulaButton";
import { PageSizeSelect } from "../visits/PageSizeSelect";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { HoverCard } from "@/components/ui/hover-card";

const PAGE_SIZES = [10, 25, 50];

type FormulaRow = {
  id: string;
  code: string;
  name: string;
  version: number;
  category: string;
  syndrome: string | null;
  is_active: boolean;
  item_count: number;
  items_preview: string | null;
};

export default async function FormulasListPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    page?: string;
    size?: string;
  }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const categoryFilter = sp.category ?? "all";
  const statusFilter = ["active", "inactive"].includes(sp.status ?? "")
    ? sp.status!
    : "all";
  const pageSize = PAGE_SIZES.includes(Number(sp.size)) ? Number(sp.size) : 10;
  const page = Math.max(1, Number(sp.page) || 1);

  const canEdit = user.role === "admin" || user.role === "practitioner";

  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (q) {
    where.push(
      `(t.name ILIKE $${i} OR t.syndrome ILIKE $${i} OR t.indications ILIKE $${i})`,
    );
    params.push(`%${q}%`);
    i++;
  }
  if (categoryFilter !== "all") {
    where.push(`t.category = $${i}`);
    params.push(categoryFilter);
    i++;
  }
  if (statusFilter === "active") {
    where.push(`t.is_active = true`);
  } else if (statusFilter === "inactive") {
    where.push(`t.is_active = false`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // Chỉ version mới nhất của mỗi code
  const baseFrom = `
    FROM prescription_templates t
    ${whereSql}
  `;

  const countRes = await db.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM (
       SELECT DISTINCT ON (t.code) t.code ${baseFrom} ORDER BY t.code, t.version DESC
     ) s`,
    params,
  );
  const total = countRes.rows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const { rows } = await db.query<FormulaRow>(
    `SELECT DISTINCT ON (t.code) t.id, t.code, t.name, t.version, t.category,
            t.syndrome, t.is_active,
            (SELECT COUNT(*)::int FROM prescription_template_items i WHERE i.template_id = t.id) AS item_count,
            (SELECT string_agg(i2.herb_name || ' ' || COALESCE(i2.dosage_text, ''), ', ' ORDER BY i2.sort_order)
             FROM prescription_template_items i2 WHERE i2.template_id = t.id) AS items_preview
     ${baseFrom}
     ORDER BY t.code, t.version DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, pageSize, offset],
  );

  const buildHref = (overrides: Record<string, string>) => {
    const next: Record<string, string> = {
      q,
      category: categoryFilter,
      status: statusFilter,
      page: String(safePage),
      size: String(pageSize),
      ...overrides,
    };
    const all = Object.entries(next).filter(
      ([k, v]) =>
        v && !(k === "category" && v === "all") && !(k === "status" && v === "all"),
    );
    return all.length
      ? `/formulas?${all.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`
      : "/formulas";
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
              Bài thuốc mẫu
            </h1>
            <p className="text-sm text-stone-500">{total} bài thuốc</p>
          </div>
          {canEdit && (
            <Link href="/formulas/new">
              <Button className="bg-emerald-800 hover:bg-emerald-900">
                <Plus className="mr-1 h-4 w-4" /> Thêm bài thuốc
              </Button>
            </Link>
          )}
        </div>

        {/* Toolbar lọc */}
        <FormulaFilterToolbar
          initialQ={q}
          initialCategory={categoryFilter}
          initialStatus={statusFilter}
        />

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-stone-500">
              Không tìm thấy bài thuốc nào.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop: bảng */}
            <div className="hidden overflow-x-auto rounded-lg border border-stone-200 bg-white md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-500">
                    <th className="px-4 py-3">Mã</th>
                    <th className="px-4 py-3">Tên bài thuốc</th>
                    <th className="px-4 py-3">Phân loại</th>
                    <th className="px-4 py-3">Hội chứng / Chủ trị</th>
                    <th className="px-4 py-3">Thành phần</th>
                    <th className="px-4 py-3 text-center">Ver</th>
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
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-stone-700">
                        {r.code}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/formulas/${r.id}`}
                          className="font-semibold text-stone-900 hover:text-emerald-700"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                        {CATEGORY_LABEL[r.category] ?? r.category}
                      </td>
                      <td className="max-w-52 truncate px-4 py-3 text-stone-600">
                        {r.syndrome || <span className="text-stone-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                        {r.items_preview ? (
                          <HoverCard
                            trigger={<span>{r.item_count} vị</span>}
                          >
                            <p className="mb-1 text-xs font-semibold text-stone-500">
                              Thành phần
                            </p>
                            <p className="text-sm leading-relaxed text-stone-700">
                              {r.items_preview}
                            </p>
                          </HoverCard>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <Badge variant="outline">v{r.version}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge
                          variant={r.is_active ? "default" : "secondary"}
                          className={
                            r.is_active
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                              : ""
                          }
                        >
                          {r.is_active ? "Đang dùng" : "Ngưng"}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Tooltip label="Xem chi tiết">
                            <Link href={`/formulas/${r.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-stone-500 hover:text-emerald-700"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </Tooltip>
                          {canEdit && (
                            <>
                              <DuplicateFormulaButton formulaId={r.id} />
                              <Tooltip label="Chỉnh sửa">
                                <Link href={`/formulas/${r.id}/edit`}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-stone-500 hover:text-emerald-700"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </Tooltip>
                            </>
                          )}
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
                  <CardContent className="space-y-1.5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-900">{r.name}</p>
                        <p className="text-xs text-stone-500">
                          {r.code} · v{r.version} ·{" "}
                          {CATEGORY_LABEL[r.category] ?? r.category}
                        </p>
                      </div>
                      <Badge
                        variant={r.is_active ? "default" : "secondary"}
                        className={
                          r.is_active
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 shrink-0"
                            : "shrink-0"
                        }
                      >
                        {r.is_active ? "Đang dùng" : "Ngưng"}
                      </Badge>
                    </div>
                    {r.items_preview && (
                      <p className="line-clamp-2 text-xs text-stone-500">
                        {r.item_count} vị: {r.items_preview}
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Link href={`/formulas/${r.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-1 h-3.5 w-3.5" /> Chi tiết
                        </Button>
                      </Link>
                      {canEdit && (
                        <Link href={`/formulas/${r.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Sửa
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chân bảng */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-stone-500">
              <p>
                {total === 0
                  ? "Không có bài thuốc nào"
                  : `Hiển thị ${offset + 1}–${Math.min(offset + pageSize, total)} trên ${total} bài thuốc`}
              </p>
              <div className="flex items-center gap-3">
                <PageSizeSelect value={pageSize} options={PAGE_SIZES} basePath="/formulas" />
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
