import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export interface FormulaRow {
  id: string;
  code: string;
  name: string;
  version: number;
  category: string;
  syndrome: string | null;
  is_active: boolean;
  item_count: number;
  items_preview: string | null;
}

export interface FormulaItem {
  herb_name: string;
  herb_name_key?: string;
  dosage_text: string | null;
  note: string | null;
}

export interface FormulaCase {
  id: string;
  disease_name: string;
  pattern: string | null;
  treatment_principle: string | null;
}

export interface FormulaVersionHistory {
  id: string;
  version: number;
  created_at: string;
  is_active: boolean;
}

export interface FormulaDetail {
  id: string;
  code: string;
  name: string;
  version: number;
  category: string;
  source_book: string | null;
  syndrome: string | null;
  indications: string | null;
  usage_note: string | null;
  is_active: boolean;
  created_at: string;
  created_by_name: string | null;
  items: FormulaItem[];
  cases: FormulaCase[];
  versions: FormulaVersionHistory[];
}

export type FormulaCategory = "co_phuong" | "gia_truyen" | "tu_che";

export interface FormulaEditData {
  id: string;
  code: string;
  name: string;
  version: number;
  category: FormulaCategory;
  source_book: string | null;
  syndrome: string | null;
  indications: string | null;
  usage_note: string | null;
  items: Array<{
    herb_name: string;
    dosage_text: string | null;
    note: string | null;
  }>;
}

export interface FormulasFilterParams {
  q?: string;
  category?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface FormulasListResult {
  rows: FormulaRow[];
  total: number;
  totalPages: number;
  safePage: number;
  offset: number;
  pageSize: number;
}

const PAGE_SIZES = [10, 25, 50];

/**
 * Lấy danh sách bài thuốc mẫu (chỉ lấy version mới nhất của mỗi code)
 */
export async function getFormulasList(
  params: FormulasFilterParams = {},
): Promise<FormulasListResult> {
  await requireUser();

  const q = (params.q ?? "").trim();
  const categoryFilter = params.category ?? "all";
  const statusFilter = ["active", "inactive"].includes(params.status ?? "")
    ? params.status!
    : "all";

  const rawSize = params.pageSize ? Number(params.pageSize) : 10;
  const pageSize = PAGE_SIZES.includes(rawSize) ? rawSize : 10;
  const page = Math.max(1, Number(params.page) || 1);

  const where: string[] = [];
  const queryParams: unknown[] = [];
  let i = 1;

  if (q) {
    where.push(
      `(t.name ILIKE $${i} OR t.syndrome ILIKE $${i} OR t.indications ILIKE $${i})`,
    );
    queryParams.push(`%${q}%`);
    i++;
  }
  if (categoryFilter !== "all") {
    where.push(`t.category = $${i}`);
    queryParams.push(categoryFilter);
    i++;
  }
  if (statusFilter === "active") {
    where.push(`t.is_active = true`);
  } else if (statusFilter === "inactive") {
    where.push(`t.is_active = false`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const baseFrom = `
    FROM prescription_templates t
    ${whereSql}
  `;

  const countRes = await db.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM (
       SELECT DISTINCT ON (t.code) t.code ${baseFrom} ORDER BY t.code, t.version DESC
     ) s`,
    queryParams,
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
 * Lấy chi tiết bài thuốc mẫu kèm các vị thuốc, ca bệnh liên kết và lịch sử phiên bản
 */
export async function getFormulaDetail(
  id: string,
): Promise<FormulaDetail | null> {
  await requireUser();

  const { rows: tpl } = await db.query<
    Omit<FormulaDetail, "items" | "cases" | "versions">
  >(
    `SELECT t.*, u.full_name AS created_by_name
     FROM prescription_templates t
     LEFT JOIN users u ON u.id = t.created_by
     WHERE t.id = $1`,
    [id],
  );
  if (tpl.length === 0) return null;
  const t = tpl[0];

  const [itemsRes, casesRes, versionsRes] = await Promise.all([
    db.query<FormulaItem>(
      `SELECT herb_name, herb_name_key, dosage_text, note
       FROM prescription_template_items
       WHERE template_id = $1 ORDER BY sort_order`,
      [id],
    ),
    db.query<FormulaCase>(
      `SELECT c.id, d.name AS disease_name, c.pattern, c.treatment_principle
       FROM clinical_cases c
       LEFT JOIN diseases d ON d.id = c.disease_id
       WHERE c.template_id = $1 AND c.is_active = true
       ORDER BY c.created_at DESC`,
      [id],
    ),
    db.query<FormulaVersionHistory>(
      `SELECT id, version, created_at, is_active
       FROM prescription_templates
       WHERE code = $1 ORDER BY version DESC`,
      [t.code],
    ),
  ]);

  return {
    ...t,
    items: itemsRes.rows,
    cases: casesRes.rows,
    versions: versionsRes.rows,
  };
}

/**
 * Lấy dữ liệu bài thuốc để phục vụ chỉnh sửa (tạo version mới)
 */
export async function getFormulaForEdit(
  id: string,
): Promise<FormulaEditData | null> {
  await requireUser();

  const { rows: tpl } = await db.query<Omit<FormulaEditData, "items">>(
    `SELECT id, name, category, source_book, syndrome, indications, usage_note, version, code
     FROM prescription_templates WHERE id = $1`,
    [id],
  );
  if (tpl.length === 0) return null;

  const { rows: items } = await db.query<FormulaEditData["items"][number]>(
    `SELECT herb_name, dosage_text, note
     FROM prescription_template_items
     WHERE template_id = $1 ORDER BY sort_order`,
    [id],
  );

  return {
    ...tpl[0],
    items,
  };
}
