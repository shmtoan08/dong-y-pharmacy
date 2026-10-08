import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Pencil } from "lucide-react";
import { HerbFilterToolbar } from "./HerbFilterToolbar";
import { PageSizeSelect } from "../visits/PageSizeSelect";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

const PAGE_SIZES = [10, 25, 50];

const UNIT_LABEL: Record<string, string> = {
  gram: "gam",
  g: "gam",
  kg: "kg",
  lang: "lạng",
};

function formatQty(qty: number, unit: string): string {
  const u = UNIT_LABEL[unit] ?? unit;
  if (unit === "gram" || unit === "g") {
    if (qty >= 1000) return `${(qty / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} kg`;
    return `${qty.toLocaleString("vi-VN")} g`;
  }
  return `${qty.toLocaleString("vi-VN")} ${u}`;
}

function stockStatus(stock: number, minStock: number): {
  label: string;
  className: string;
} {
  if (stock <= 0)
    return {
      label: "Hết hàng",
      className: "bg-red-100 text-red-700 hover:bg-red-100",
    };
  if (stock <= minStock)
    return {
      label: "Sắp hết",
      className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    };
  return {
    label: "Sẵn có",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  };
}

type HerbRow = {
  id: string;
  code: string;
  name_common: string;
  name_han_viet: string | null;
  name_science: string | null;
  property_tinh: string | null;
  property_vi: string | null;
  quy_kinh: string[] | null;
  base_unit: string;
  price_per_unit: number | null;
  stock_quantity: number;
  min_stock_quantity: number;
  is_active: boolean;
};

export default async function HerbsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tinh?: string;
    quykinh?: string;
    stock?: string;
    page?: string;
    size?: string;
  }>;
}) {
  await requireRole("admin", "practitioner", "dispenser");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const tinhFilter = sp.tinh ?? "all";
  const quyKinhFilter = sp.quykinh ?? "all";
  const stockFilter = ["available", "low", "out"].includes(sp.stock ?? "")
    ? sp.stock!
    : "all";
  const pageSize = PAGE_SIZES.includes(Number(sp.size)) ? Number(sp.size) : 10;
  const page = Math.max(1, Number(sp.page) || 1);

  const { normalizeHerbKey } = await import("@/lib/herb-key");
  const queryKey = normalizeHerbKey(q);

  // Quy kinh options (distinct)
  const qkRes = await db.query<{ k: string }>(
    `SELECT DISTINCT unnest(quy_kinh) AS k FROM herbs WHERE quy_kinh IS NOT NULL ORDER BY k`,
  );
  const quyKinhOptions = qkRes.rows.map((r) => r.k);

  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (q) {
    where.push(
      `(h.name_common ILIKE $${i} OR h.code ILIKE $${i} OR h.canonical_key LIKE $${i + 1})`,
    );
    params.push(`%${q}%`, `%${queryKey}%`);
    i += 2;
  }
  if (tinhFilter !== "all") {
    where.push(`h.property_tinh ILIKE $${i}`);
    params.push(tinhFilter);
    i++;
  }
  if (quyKinhFilter !== "all") {
    where.push(`$${i} = ANY(h.quy_kinh)`);
    params.push(quyKinhFilter);
    i++;
  }
  if (stockFilter === "out") {
    where.push(`COALESCE((SELECT SUM(l.quantity_current) FROM stock_lots l WHERE l.herb_id = h.id), 0) <= 0`);
  } else if (stockFilter === "low") {
    where.push(`COALESCE((SELECT SUM(l.quantity_current) FROM stock_lots l WHERE l.herb_id = h.id), 0) BETWEEN 1 AND h.min_stock_quantity`);
  } else if (stockFilter === "available") {
    where.push(`COALESCE((SELECT SUM(l.quantity_current) FROM stock_lots l WHERE l.herb_id = h.id), 0) > h.min_stock_quantity`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRes = await db.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM herbs h ${whereSql}`,
    params,
  );
  const total = countRes.rows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const { rows } = await db.query<HerbRow>(
    `SELECT h.id, h.code, h.name_common, h.name_han_viet, h.name_science,
            h.property_tinh, h.property_vi, h.quy_kinh, h.base_unit,
            h.price_per_unit, COALESCE((SELECT SUM(l.quantity_current) FROM stock_lots l WHERE l.herb_id = h.id), 0) AS stock_quantity, h.min_stock_quantity, h.is_active
     FROM herbs h
     ${whereSql}
     ORDER BY h.code
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, pageSize, offset],
  );

  const buildHref = (overrides: Record<string, string>) => {
    const next: Record<string, string> = {
      q,
      tinh: tinhFilter,
      quykinh: quyKinhFilter,
      stock: stockFilter,
      page: String(safePage),
      size: String(pageSize),
      ...overrides,
    };
    const all = Object.entries(next).filter(
      ([k, v]) =>
        v &&
        !(k === "tinh" && v === "all") &&
        !(k === "quykinh" && v === "all") &&
        !(k === "stock" && v === "all"),
    );
    return all.length
      ? `/herbs?${all.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`
      : "/herbs";
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
              Danh mục vị thuốc
            </h1>
            <p className="text-sm text-stone-500">{total} vị thuốc</p>
          </div>
          <div className="flex gap-2">
            <Link href="/herbs/migrate">
              <Button variant="outline" size="sm">
                Chuẩn hóa tên
              </Button>
            </Link>
            <Link href="/herbs/new">
              <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900">
                <Plus className="mr-1 h-4 w-4" /> Thêm vị thuốc
              </Button>
            </Link>
          </div>
        </div>

        {/* Toolbar lọc */}
        <HerbFilterToolbar
          initialQ={q}
          initialTinh={tinhFilter}
          initialQuyKinh={quyKinhFilter}
          initialStock={stockFilter}
          quyKinhOptions={quyKinhOptions}
        />

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-stone-500">
              Không tìm thấy vị thuốc nào.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop: bảng */}
            <div className="hidden overflow-x-auto rounded-lg border border-stone-200 bg-white md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-500">
                    <th className="px-4 py-3">Mã VT</th>
                    <th className="px-4 py-3">Tên vị thuốc</th>
                    <th className="px-4 py-3">Tính vị - Quy kinh</th>
                    <th className="px-4 py-3">ĐVT</th>
                    <th className="px-4 py-3 text-right">Đơn giá</th>
                    <th className="px-4 py-3 text-right">Tồn kho</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((h) => {
                    const st = stockStatus(
                      Number(h.stock_quantity),
                      Number(h.min_stock_quantity),
                    );
                    const tinhVi = [h.property_tinh, h.property_vi]
                      .filter(Boolean)
                      .join(", ");
                    return (
                      <tr
                        key={h.id}
                        className="border-b border-stone-100 transition-colors last:border-0 hover:bg-stone-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-stone-700">
                          {h.code}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-stone-900">
                            {h.name_common}
                          </p>
                          {(h.name_science || h.name_han_viet) && (
                            <p className="text-xs text-stone-500">
                              {[h.name_science, h.name_han_viet]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          {tinhVi && (
                            <p className="capitalize">{tinhVi}</p>
                          )}
                          {h.quy_kinh && h.quy_kinh.length > 0 && (
                            <p className="text-xs text-stone-500">
                              Quy kinh: {h.quy_kinh.join(", ")}
                            </p>
                          )}
                          {!tinhVi && (!h.quy_kinh || h.quy_kinh.length === 0) && (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                          {UNIT_LABEL[h.base_unit] ?? h.base_unit}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-stone-600">
                          {h.price_per_unit != null ? (
                            <>
                              {Number(h.price_per_unit).toLocaleString("vi-VN")}
                              <span className="text-xs text-stone-400"> đ</span>
                            </>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-stone-600">
                          {formatQty(Number(h.stock_quantity), h.base_unit)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {!h.is_active ? (
                            <Badge variant="secondary">Ngưng</Badge>
                          ) : (
                            <Badge className={st.className}>{st.label}</Badge>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Tooltip label="Xem chi tiết">
                              <Link href={`/herbs/${h.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-stone-500 hover:text-emerald-700"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </Tooltip>
                            <Tooltip label="Chỉnh sửa">
                              <Link href={`/herbs/${h.id}/edit`}>
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <div className="grid gap-3 md:hidden">
              {rows.map((h) => {
                const st = stockStatus(
                  Number(h.stock_quantity),
                  Number(h.min_stock_quantity),
                );
                return (
                  <Card key={h.id} className="transition-shadow hover:shadow-md">
                    <CardContent className="space-y-1.5 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-900">
                            {h.name_common}
                          </p>
                          <p className="text-xs text-stone-500">{h.code}</p>
                        </div>
                        <Badge className={`${st.className} shrink-0`}>
                          {st.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-stone-500">
                        Tồn: {formatQty(Number(h.stock_quantity), h.base_unit)}
                        {h.price_per_unit != null &&
                          ` · ${Number(h.price_per_unit).toLocaleString("vi-VN")} đ`}
                      </p>
                      <div className="flex gap-2 pt-1">
                        <Link href={`/herbs/${h.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-1 h-3.5 w-3.5" /> Chi tiết
                          </Button>
                        </Link>
                        <Link href={`/herbs/${h.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Sửa
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Chân bảng */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-stone-500">
              <p>
                {total === 0
                  ? "Không có vị thuốc nào"
                  : `Hiển thị ${offset + 1}–${Math.min(offset + pageSize, total)} trên ${total} vị thuốc`}
              </p>
              <div className="flex items-center gap-3">
                <PageSizeSelect value={pageSize} options={PAGE_SIZES} basePath="/herbs" />
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
