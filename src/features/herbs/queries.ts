import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { normalizeHerbKey } from "@/lib/herb-key";

export interface Herb {
  id: string;
  code: string;
  name_common: string;
  canonical_key: string;
  name_han_viet: string | null;
  name_science: string | null;
  used_part: string | null;
  property_tinh: string | null;
  property_vi: string | null;
  quy_kinh: string[] | null;
  cong_nang: string | null;
  kieng_ky: string | null;
  vi_tri_hoc_tu: string | null;
  medicine_type: string | null;
  image_url: string | null;
  preparation: string | null;
  usage: string | null;
  herb_group_id: string | null;
  group_name: string | null;
  base_unit: string;
  price_per_unit: number | null;
  stock_quantity: number;
  min_stock_quantity: number;
  is_valuable: boolean;
  is_active: boolean;
}

export interface HerbAlias {
  id: string;
  alias_name: string;
  alias_key: string;
}

export type HerbDetail = Herb & { aliases: HerbAlias[] };

export interface HerbRow {
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
}

export interface HerbsFilterParams {
  q?: string;
  tinh?: string;
  quykinh?: string;
  stock?: string;
  type?: string;
  group?: string;
  page?: number;
  pageSize?: number;
}

export interface HerbsListResult {
  rows: HerbRow[];
  total: number;
  totalPages: number;
  safePage: number;
  offset: number;
  pageSize: number;
}

export interface MappingRow {
  id: string;
  source_text: string;
  normalized_key: string;
  herb_id: string | null;
  herb_name: string | null;
  herb_code: string | null;
  confidence: string | null;
  status: string;
  rejection_reason: string | null;
}

const PAGE_SIZES = [10, 25, 50];

/**
 * Lấy các tùy chọn lọc quy kinh và nhóm thuốc
 */
export async function getHerbFilterOptions(): Promise<{
  quyKinhOptions: string[];
  groupOptions: { id: string; name: string }[];
}> {
  await requireRole("admin", "practitioner", "dispenser");
  const [qkRes, grpRes] = await Promise.all([
    db.query<{ k: string }>(
      `SELECT DISTINCT unnest(quy_kinh) AS k FROM herbs WHERE quy_kinh IS NOT NULL ORDER BY k`,
    ),
    db.query<{ id: string; name: string }>(
      `SELECT id, name FROM herb_groups ORDER BY sort_order`,
    ),
  ]);

  return {
    quyKinhOptions: qkRes.rows.map((r) => r.k),
    groupOptions: grpRes.rows,
  };
}

/**
 * Lấy danh sách vị thuốc có phân trang và bộ lọc nâng cao
 */
export async function getHerbsList(
  params: HerbsFilterParams = {},
): Promise<HerbsListResult> {
  await requireRole("admin", "practitioner", "dispenser");

  const q = (params.q ?? "").trim();
  const tinhFilter = params.tinh ?? "all";
  const quyKinhFilter = params.quykinh ?? "all";
  const stockFilter = ["available", "low", "out"].includes(params.stock ?? "")
    ? params.stock!
    : "all";
  const typeFilter = ["bac", "nam", "ca_hai", "all"].includes(params.type ?? "")
    ? params.type!
    : "bac";
  const groupFilter = params.group ?? "all";

  const rawSize = params.pageSize ? Number(params.pageSize) : 10;
  const pageSize = PAGE_SIZES.includes(rawSize) ? rawSize : 10;
  const page = Math.max(1, Number(params.page) || 1);

  const queryKey = normalizeHerbKey(q);

  const where: string[] = [];
  const queryParams: unknown[] = [];
  let i = 1;

  if (q) {
    where.push(
      `(h.name_common ILIKE $${i} OR h.code ILIKE $${i} OR h.canonical_key LIKE $${i + 1} OR EXISTS (SELECT 1 FROM herb_aliases a WHERE a.herb_id = h.id AND (a.alias_name ILIKE $${i} OR a.alias_key LIKE $${i + 1})))`,
    );
    queryParams.push(`%${q}%`, `%${queryKey}%`);
    i += 2;
  }
  if (tinhFilter !== "all") {
    where.push(`h.property_tinh ILIKE $${i}`);
    queryParams.push(tinhFilter);
    i++;
  }
  if (quyKinhFilter !== "all") {
    where.push(`$${i} = ANY(h.quy_kinh)`);
    queryParams.push(quyKinhFilter);
    i++;
  }
  if (typeFilter !== "all") {
    where.push(`h.medicine_type = $${i}`);
    queryParams.push(typeFilter);
    i++;
  }
  if (groupFilter !== "all") {
    where.push(`h.herb_group_id = $${i}`);
    queryParams.push(groupFilter);
    i++;
  }
  if (stockFilter === "out") {
    where.push(
      `COALESCE((SELECT SUM(l.quantity_current) FROM stock_lots l WHERE l.herb_id = h.id), 0) <= 0`,
    );
  } else if (stockFilter === "low") {
    where.push(
      `COALESCE((SELECT SUM(l.quantity_current) FROM stock_lots l WHERE l.herb_id = h.id), 0) BETWEEN 1 AND h.min_stock_quantity`,
    );
  } else if (stockFilter === "available") {
    where.push(
      `COALESCE((SELECT SUM(l.quantity_current) FROM stock_lots l WHERE l.herb_id = h.id), 0) > h.min_stock_quantity`,
    );
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRes = await db.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM herbs h ${whereSql}`,
    queryParams,
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
    [...queryParams, pageSize, offset],
  );

  return {
    rows,
    total,
    totalPages,
    safePage,
    offset,
    pageSize,
  };
}

/**
 * Tìm kiếm vị thuốc (cho autocomplete khi kê đơn): khớp tên, mã, key, alias
 */
export async function searchHerbs(
  query: string,
  limit = 10,
): Promise<Herb[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const trimmed = query.trim();
  const q = `%${trimmed}%`;
  const key = `%${normalizeHerbKey(trimmed)}%`;
  const qPrefix = `${trimmed}%`;
  const keyPrefix = `${normalizeHerbKey(trimmed)}%`;

  const { rows } = await db.query<Herb>(
    `SELECT h.id, h.code, h.name_common, h.canonical_key, h.name_han_viet,
            h.name_science, h.used_part, h.property_tinh, h.property_vi,
            h.quy_kinh, h.cong_nang, h.base_unit, h.price_per_unit,
            COALESCE((SELECT SUM(l.quantity_current) FROM stock_lots l WHERE l.herb_id = h.id), 0) AS stock_quantity,
            h.min_stock_quantity, h.is_valuable, h.is_active
     FROM herbs h
     LEFT JOIN herb_aliases a ON a.herb_id = h.id
     WHERE h.is_active = true
       AND (h.name_common ILIKE $1 OR h.code ILIKE $1
            OR h.canonical_key LIKE $2 OR a.alias_key LIKE $2 OR a.alias_name ILIKE $1)
     GROUP BY h.id
     ORDER BY
       CASE WHEN h.name_common ILIKE $4 THEN 0
            WHEN h.canonical_key LIKE $5 THEN 1
            ELSE 2 END,
       h.name_common
     LIMIT $3`,
    [q, key, limit, qPrefix, keyPrefix],
  );
  return rows;
}

/**
 * Lấy chi tiết vị thuốc cùng danh sách alias
 */
export async function getHerb(
  id: string,
): Promise<HerbDetail | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<Herb>(
    `SELECT h.*, g.name AS group_name FROM herbs h LEFT JOIN herb_groups g ON g.id = h.herb_group_id WHERE h.id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  const { rows: aliases } = await db.query<HerbAlias>(
    `SELECT id, alias_name, alias_key FROM herb_aliases WHERE herb_id = $1 ORDER BY alias_name`,
    [id],
  );
  return { ...rows[0], aliases };
}

/**
 * Lấy danh sách alias của một vị thuốc
 */
export async function getHerbAliases(herbId: string): Promise<HerbAlias[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<HerbAlias>(
    `SELECT id, alias_name, alias_key FROM herb_aliases WHERE herb_id = $1 ORDER BY alias_name`,
    [herbId],
  );
  return rows;
}

/**
 * Lấy danh sách mappings chuyển đổi dữ liệu
 */
export async function getMappings(status?: string): Promise<MappingRow[]> {
  await requireRole("admin", "practitioner");
  const { rows } = await db.query<MappingRow>(
    `SELECT m.id, m.source_text, m.normalized_key, m.herb_id,
            h.name_common AS herb_name, h.code AS herb_code,
            m.confidence, m.status, m.rejection_reason
     FROM herb_migration_mappings m
     LEFT JOIN herbs h ON h.id = m.herb_id
     ${status ? "WHERE m.status = $1" : ""}
     ORDER BY m.source_text`,
    status ? [status] : [],
  );
  return rows;
}

/**
 * Thống kê tình trạng chuyển đổi dữ liệu
 */
export async function getMappingStats(): Promise<{
  pending: number;
  confirmed: number;
  rejected: number;
  total: number;
}> {
  await requireRole("admin", "practitioner");
  const { rows } = await db.query<{ status: string; count: string }>(
    `SELECT status, COUNT(*) AS count FROM herb_migration_mappings GROUP BY status`,
  );
  const s = { pending: 0, confirmed: 0, rejected: 0, total: 0 };
  for (const r of rows) {
    const c = Number(r.count);
    s.total += c;
    if (r.status === "pending") s.pending = c;
    else if (r.status === "confirmed") s.confirmed = c;
    else if (r.status === "rejected") s.rejected = c;
  }
  return s;
}
