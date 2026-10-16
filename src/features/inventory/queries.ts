import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export interface ReceiptRow {
  id: string;
  receipt_code: string;
  supplier_id: string | null;
  supplier_name: string | null;
  status: string;
  received_at: string;
  item_count: number;
  total_amount: number | null;
  created_by_name: string;
}

export interface ReceiptDetail {
  id: string;
  receipt_code: string;
  supplier_id: string | null;
  supplier_name: string | null;
  status: string;
  received_at: string;
  note: string | null;
  created_by_name: string;
  confirmed_by_name: string | null;
  confirmed_at: string | null;
  items: {
    id: string;
    herb_id: string;
    herb_code: string;
    herb_name: string;
    base_unit: string;
    quantity: number;
    unit_price: number | null;
    expiry_date: string | null;
    supplier_lot_code: string | null;
    lot_code: string | null;
  }[];
}

export interface LotRow {
  id: string;
  lot_code: string;
  herb_id: string;
  herb_code: string;
  herb_name: string;
  base_unit: string;
  supplier_id: string | null;
  supplier_name: string | null;
  receipt_id: string | null;
  receipt_code: string | null;
  quantity_initial: number;
  quantity_current: number;
  expiry_date: string | null;
  supplier_lot_code: string | null;
  storage_location: string | null;
  created_at: string;
}

export interface LotDetail extends LotRow {
  herb_unit: string;
  storage_location: string | null;
  receipt_date: string | null;
}

export interface StockCheckRow {
  id: string;
  check_code: string;
  status: string;
  note: string | null;
  created_by_name: string | null;
  confirmed_by_name: string | null;
  confirmed_at: string | null;
  created_at: string;
  item_count: number;
  total_diff: number;
  diff_count: number;
}

export interface StockCheckItemRow {
  id: string;
  lot_id: string;
  lot_code: string;
  herb_name: string;
  herb_code: string;
  base_unit: string;
  storage_location: string | null;
  system_qty: number;
  actual_qty: number | null;
  diff_reason: string | null;
}

/**
 * Danh sách phiếu nhập kho
 */
export async function listReceipts(): Promise<ReceiptRow[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<ReceiptRow>(
    `SELECT r.id, r.receipt_code, r.supplier_id, s.name AS supplier_name,
            r.status, r.received_at,
            COUNT(ri.id)::INT AS item_count,
            SUM(ri.quantity * COALESCE(ri.unit_price, 0))::NUMERIC AS total_amount,
            u.full_name AS created_by_name
     FROM stock_receipts r
     LEFT JOIN suppliers s ON s.id = r.supplier_id
     LEFT JOIN stock_receipt_items ri ON ri.receipt_id = r.id
     JOIN users u ON u.id = r.created_by
     GROUP BY r.id, s.name, u.full_name
     ORDER BY r.created_at DESC`,
  );
  return rows;
}

/**
 * Chi tiết phiếu nhập kho kèm các mục thuốc
 */
export async function getReceipt(id: string): Promise<ReceiptDetail | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query(
    `SELECT r.id, r.receipt_code, r.supplier_id, s.name AS supplier_name,
            r.status, r.received_at, r.note,
            uc.full_name AS created_by_name,
            uf.full_name AS confirmed_by_name, r.confirmed_at
     FROM stock_receipts r
     LEFT JOIN suppliers s ON s.id = r.supplier_id
     JOIN users uc ON uc.id = r.created_by
     LEFT JOIN users uf ON uf.id = r.confirmed_by
     WHERE r.id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  const { rows: items } = await db.query(
    `SELECT ri.id, ri.herb_id, h.code AS herb_code, h.name_common AS herb_name,
            h.base_unit, ri.quantity, ri.unit_price, ri.expiry_date, ri.supplier_lot_code, l.lot_code
     FROM stock_receipt_items ri
     JOIN herbs h ON h.id = ri.herb_id
     LEFT JOIN stock_lots l ON l.id = ri.lot_id
     WHERE ri.receipt_id = $1 ORDER BY ri.created_at`,
    [id],
  );
  return { ...rows[0], items } as ReceiptDetail;
}

/**
 * Danh sách các lô dược liệu trong kho theo bộ lọc
 */
export async function listLots(filter?: {
  herbId?: string;
  supplierId?: string;
  stockStatus?: "in_stock" | "out_of_stock";
  expiry?: "expired" | "expiring" | "valid" | "no_expiry";
}): Promise<LotRow[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const conds: string[] = [];
  const params: unknown[] = [];
  if (filter?.herbId) {
    params.push(filter.herbId);
    conds.push(`l.herb_id = $${params.length}`);
  }
  if (filter?.supplierId) {
    params.push(filter.supplierId);
    conds.push(`l.supplier_id = $${params.length}`);
  }
  if (filter?.stockStatus === "in_stock") {
    conds.push(`l.quantity_current > 0`);
  } else if (filter?.stockStatus === "out_of_stock") {
    conds.push(`l.quantity_current <= 0`);
  }
  if (filter?.expiry === "expired") {
    conds.push(`l.expiry_date IS NOT NULL AND l.expiry_date < CURRENT_DATE`);
  } else if (filter?.expiry === "expiring") {
    conds.push(
      `l.expiry_date IS NOT NULL AND l.expiry_date >= CURRENT_DATE AND l.expiry_date <= CURRENT_DATE + INTERVAL '30 days'`,
    );
  } else if (filter?.expiry === "valid") {
    conds.push(
      `(l.expiry_date IS NULL OR l.expiry_date > CURRENT_DATE + INTERVAL '30 days')`,
    );
  } else if (filter?.expiry === "no_expiry") {
    conds.push(`l.expiry_date IS NULL`);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";
  const { rows } = await db.query<LotRow>(
    `SELECT l.id, l.lot_code, l.herb_id, h.code AS herb_code, h.name_common AS herb_name,
            h.base_unit, h.vi_tri_hoc_tu AS storage_location,
            l.supplier_id, s.name AS supplier_name,
            l.receipt_id, r.receipt_code,
            l.quantity_initial, l.quantity_current, l.expiry_date, l.supplier_lot_code, l.created_at
     FROM stock_lots l
     JOIN herbs h ON h.id = l.herb_id
     LEFT JOIN suppliers s ON s.id = l.supplier_id
     LEFT JOIN stock_receipts r ON r.id = l.receipt_id
     ${where}
     ORDER BY l.created_at DESC`,
    params,
  );
  return rows;
}

/**
 * Chi tiết một lô dược liệu
 */
export async function getLotDetail(id: string): Promise<LotDetail | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query(
    `SELECT l.id, l.lot_code, l.herb_id, h.code AS herb_code, h.name_common AS herb_name,
            h.base_unit, h.vi_tri_hoc_tu AS storage_location,
            l.supplier_id, s.name AS supplier_name,
            l.receipt_id, r.receipt_code, r.received_at AS receipt_date,
            l.quantity_initial, l.quantity_current, l.expiry_date,
            l.supplier_lot_code, l.created_at
     FROM stock_lots l
     JOIN herbs h ON h.id = l.herb_id
     LEFT JOIN suppliers s ON s.id = l.supplier_id
     LEFT JOIN stock_receipts r ON r.id = l.receipt_id
     WHERE l.id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  return { ...rows[0], herb_unit: rows[0].base_unit } as LotDetail;
}

/**
 * Lịch sử biến động lô từ audit_logs
 */
export async function getLotHistory(lotId: string): Promise<
  { action: string; created_at: string; user_name: string; new_value: unknown }[]
> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<{
    action: string;
    created_at: string;
    user_name: string;
    new_value: unknown;
  }>(
    `SELECT a.action, a.created_at, u.full_name AS user_name, a.new_value
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.table_name = 'stock_lots' AND a.row_id = $1
     ORDER BY a.created_at DESC`,
    [lotId],
  );
  return rows;
}

/**
 * Lịch sử xuất-nhập của lô từ movements
 */
export async function getLotMovements(lotId: string): Promise<
  {
    quantity_change: number;
    reason: string;
    reference_type: string | null;
    created_at: string;
    user_name: string | null;
  }[]
> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<{
    quantity_change: number;
    reason: string;
    reference_type: string | null;
    created_at: string;
    user_name: string | null;
  }>(
    `SELECT m.quantity_change, m.reason, m.reference_type, m.created_at,
            u.full_name AS user_name
     FROM stock_lot_movements m
     LEFT JOIN users u ON u.id = m.created_by
     WHERE m.lot_id = $1
     ORDER BY m.created_at DESC`,
    [lotId],
  );
  return rows;
}

/**
 * Danh sách phiếu kiểm kho
 */
export async function listStockChecks(filter?: {
  q?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<StockCheckRow[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const conds: string[] = [];
  const params: unknown[] = [];
  if (filter?.q) {
    params.push(`%${filter.q}%`);
    conds.push(
      `(c.check_code ILIKE $${params.length} OR u1.full_name ILIKE $${params.length})`,
    );
  }
  if (filter?.status) {
    params.push(filter.status);
    conds.push(`c.status = $${params.length}`);
  }
  if (filter?.dateFrom) {
    params.push(filter.dateFrom);
    conds.push(`c.created_at >= $${params.length}`);
  }
  if (filter?.dateTo) {
    params.push(filter.dateTo);
    conds.push(`c.created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";
  const { rows } = await db.query(
    `SELECT c.id, c.check_code, c.status, c.note, c.created_at, c.confirmed_at,
            u1.full_name AS created_by_name, u2.full_name AS confirmed_by_name,
            (SELECT COUNT(*) FROM stock_check_items i WHERE i.check_id = c.id) AS item_count,
            COALESCE((SELECT SUM(i.actual_qty - i.system_qty) FROM stock_check_items i
                       WHERE i.check_id = c.id AND i.actual_qty IS NOT NULL), 0) AS total_diff,
            (SELECT COUNT(*) FROM stock_check_items i
             WHERE i.check_id = c.id AND i.actual_qty IS NOT NULL
               AND i.actual_qty <> i.system_qty) AS diff_count
     FROM stock_checks c
     LEFT JOIN users u1 ON u1.id = c.created_by
     LEFT JOIN users u2 ON u2.id = c.confirmed_by
     ${where}
     ORDER BY c.created_at DESC`,
    params,
  );
  return rows as StockCheckRow[];
}

/**
 * Chi tiết phiếu kiểm kho kèm danh sách các dòng kiểm kê
 */
export async function getStockCheck(id: string): Promise<{
  check: StockCheckRow;
  items: StockCheckItemRow[];
} | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const checks = await listStockChecks();
  const check = checks.find((c) => c.id === id);
  if (!check) return null;
  const { rows } = await db.query(
    `SELECT i.id, i.lot_id, l.lot_code, h.name_common AS herb_name, h.code AS herb_code,
            h.base_unit, h.vi_tri_hoc_tu AS storage_location,
            i.system_qty, i.actual_qty, i.diff_reason
     FROM stock_check_items i
     JOIN stock_lots l ON l.id = i.lot_id
     JOIN herbs h ON h.id = l.herb_id
     WHERE i.check_id = $1
     ORDER BY h.name_common`,
    [id],
  );
  return { check, items: rows as StockCheckItemRow[] };
}
