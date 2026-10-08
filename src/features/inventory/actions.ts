"use server";

import { z } from "zod";
import { db, withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { redirect } from "next/navigation";

export interface ActionState {
  error?: string;
}

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
  created_at: string;
}

async function nextReceiptCode(tx: { query: typeof db.query }): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const { rows } = await tx.query<{ next_daily_n: number }>(
    `SELECT next_daily_n($1, 'receipt')`,
    [today],
  );
  const ymd = today.replace(/-/g, "");
  return `NK-${ymd}-${String(rows[0].next_daily_n).padStart(3, "0")}`;
}

async function nextLotCode(tx: { query: typeof db.query }): Promise<string> {
  const { rows } = await tx.query<{ nextval: string }>(
    `SELECT nextval('lot_seq') AS nextval`,
  );
  return `LO-${String(rows[0].nextval).padStart(6, "0")}`;
}

const receiptSchema = z.object({
  supplier_id: z.string().uuid().optional(),
  note: z.string().max(1000).optional(),
});

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

export async function createReceipt(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner");
  const parsed = receiptSchema.safeParse({
    supplier_id: formData.get("supplier_id") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  // Parse items: items[0][herb_id], items[0][quantity], ...
  const items: { herb_id: string; quantity: number; unit_price?: number; expiry_date?: string; supplier_lot_code?: string }[] = [];
  for (let i = 0; ; i++) {
    const herbId = formData.get(`items[${i}][herb_id]`);
    if (!herbId) break;
    const qty = Number(formData.get(`items[${i}][quantity]`));
    if (!qty || qty <= 0) return { error: `Dòng ${i + 1}: số lượng phải > 0` };
    items.push({
      herb_id: String(herbId),
      quantity: qty,
      unit_price: formData.get(`items[${i}][unit_price]`)
        ? Number(formData.get(`items[${i}][unit_price]`))
        : undefined,
      expiry_date: formData.get(`items[${i}][expiry_date]`)
        ? String(formData.get(`items[${i}][expiry_date]`))
        : undefined,
      supplier_lot_code: formData.get(`items[${i}][supplier_lot_code]`)
        ? String(formData.get(`items[${i}][supplier_lot_code]`)).trim()
        : undefined,
    });
  }
  if (items.length === 0) return { error: "Phiếu nhập cần ít nhất 1 dòng" };

  const v = parsed.data;
  const receiptId = await withTransaction(async (tx) => {
    const code = await nextReceiptCode(tx);
    const { rows } = await tx.query<{ id: string }>(
      `INSERT INTO stock_receipts (receipt_code, supplier_id, note, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [code, v.supplier_id ?? null, v.note?.trim() || null, user.id],
    );
    const rid = rows[0].id;
    for (const it of items) {
      await tx.query(
        `INSERT INTO stock_receipt_items (receipt_id, herb_id, quantity, unit_price, expiry_date, supplier_lot_code)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [rid, it.herb_id, it.quantity, it.unit_price ?? null, it.expiry_date ?? null, it.supplier_lot_code ?? null],
      );
    }
    return rid;
  });

  await audit({ userId: user.id, action: "receipt.create", tableName: "stock_receipts", rowId: receiptId, newValue: {} });
  redirect(`/stock-receipts/${receiptId}`);
}

/**
 * Xác nhận nhập kho: 1 transaction duy nhất.
 * - FOR UPDATE phiếu + check draft (idempotent ở DB)
 * - Tạo lô cho từng dòng, cộng tồn kho bằng SQL trực tiếp
 */
export async function confirmReceipt(id: string): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  try {
    await withTransaction(async (tx) => {
      const { rows } = await tx.query(
        `SELECT id, status, supplier_id FROM stock_receipts WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (rows.length === 0) throw new Error("NOT_FOUND");
      if (rows[0].status !== "draft") throw new Error("NOT_DRAFT");
      const supplierId = rows[0].supplier_id;

      const { rows: items } = await tx.query(
        `SELECT id, herb_id, quantity, expiry_date, supplier_lot_code FROM stock_receipt_items WHERE receipt_id = $1`,
        [id],
      );
      for (const it of items) {
        const lotCode = await nextLotCode(tx);
        const { rows: lotRows } = await tx.query<{ id: string }>(
          `INSERT INTO stock_lots (lot_code, herb_id, supplier_id, receipt_id, quantity_initial, quantity_current, expiry_date, supplier_lot_code)
           VALUES ($1, $2, $3, $4, $5, $5, $6, $7) RETURNING id`,
          [lotCode, it.herb_id, supplierId, id, it.quantity, it.expiry_date, it.supplier_lot_code ?? null],
        );
      await tx.query(
        `INSERT INTO stock_lot_movements (lot_id, quantity_change, reason, reference_type, reference_id, created_by)
         VALUES ($1, $2, 'Nhap kho', 'STOCK_RECEIPT', $3, $4)`,
        [lotRows[0].id, it.quantity, id, user.id],
      );
        await tx.query(
          `UPDATE stock_receipt_items SET lot_id = $1 WHERE id = $2`,
          [lotRows[0].id, it.id],
        );
        // Cộng tồn kho trực tiếp ở SQL — tránh lost update
        await tx.query(
          `UPDATE herbs SET stock_quantity = stock_quantity + $1 WHERE id = $2`,
          [it.quantity, it.herb_id],
        );
      }
      await tx.query(
        `UPDATE stock_receipts SET status = 'confirmed', confirmed_by = $1, confirmed_at = NOW() WHERE id = $2`,
        [user.id, id],
      );
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_DRAFT") return { error: "Phiếu này đã được xử lý, không thể xác nhận lại" };
    if (msg === "NOT_FOUND") return { error: "Không tìm thấy phiếu nhập" };
    console.error("[confirmReceipt] failed:", e);
    return { error: "Xác nhận thất bại, vui lòng thử lại" };
  }
  await audit({ userId: user.id, action: "receipt.confirm", tableName: "stock_receipts", rowId: id, newValue: {} });
  return {};
}

/** Hủy phiếu — chỉ khi còn draft */
export async function cancelReceipt(id: string): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  const { rows } = await db.query(
    `UPDATE stock_receipts SET status = 'cancelled' WHERE id = $1 AND status = 'draft' RETURNING id`,
    [id],
  );
  if (rows.length === 0) return { error: "Chỉ hủy được phiếu đang nháp" };
  await audit({ userId: user.id, action: "receipt.cancel", tableName: "stock_receipts", rowId: id, newValue: {} });
  return {};
}

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
    conds.push(`l.expiry_date IS NOT NULL AND l.expiry_date >= CURRENT_DATE AND l.expiry_date <= CURRENT_DATE + INTERVAL '30 days'`);
  } else if (filter?.expiry === "valid") {
    conds.push(`(l.expiry_date IS NULL OR l.expiry_date > CURRENT_DATE + INTERVAL '30 days')`);
  } else if (filter?.expiry === "no_expiry") {
    conds.push(`l.expiry_date IS NULL`);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";
  const { rows } = await db.query<LotRow>(
    `SELECT l.id, l.lot_code, l.herb_id, h.code AS herb_code, h.name_common AS herb_name,
            h.base_unit, l.supplier_id, s.name AS supplier_name,
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

export interface LotDetail extends LotRow {
  herb_unit: string;
  storage_location: string | null;
  receipt_date: string | null;
}

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
 * Điều chỉnh tồn kho lô (kiểm kê thừa/thiếu).
 * Cập nhật cả tồn tổng của vị thuốc.
 */
export async function adjustLot(
  lotId: string,
  newQuantity: number,
  reason: string,
): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  if (newQuantity < 0) return { error: "Số lượng không được âm" };
  if (!reason.trim()) return { error: "Vui lòng nhập lý do điều chỉnh" };
  try {
    await withTransaction(async (tx) => {
      const { rows } = await tx.query(
        `SELECT herb_id, quantity_current FROM stock_lots WHERE id = $1 FOR UPDATE`,
        [lotId],
      );
      if (rows.length === 0) throw new Error("NOT_FOUND");
      const oldQty = Number(rows[0].quantity_current);
      const diff = newQuantity - oldQty;
      await tx.query(`UPDATE stock_lots SET quantity_current = $1 WHERE id = $2`, [
        newQuantity,
        lotId,
      ]);
      if (diff !== 0) {
        await tx.query(
          `INSERT INTO stock_lot_movements (lot_id, quantity_change, reason, reference_type, created_by)
           VALUES ($1, $2, $3, 'ADJUST', $4)`,
          [lotId, diff, reason, user.id],
        );
      }
    });
  } catch (e) {
    console.error("[adjustLot] failed:", e);
    return { error: "Điều chỉnh thất bại, vui lòng thử lại" };
  }
  await audit({
    userId: user.id,
    action: "lot.adjust",
    tableName: "stock_lots",
    rowId: lotId,
    newValue: { new_quantity: newQuantity, reason },
  });
  return {};
}

/** Hủy/thanh lý lô: đưa tồn về 0 (thuốc hỏng, hết hạn...) */
export async function discardLot(
  lotId: string,
  reason: string,
): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  if (!reason.trim()) return { error: "Vui lòng nhập lý do hủy lô" };
  try {
    await withTransaction(async (tx) => {
      const { rows } = await tx.query(
        `SELECT herb_id, quantity_current FROM stock_lots WHERE id = $1 FOR UPDATE`,
        [lotId],
      );
      if (rows.length === 0) throw new Error("NOT_FOUND");
      const qty = Number(rows[0].quantity_current);
      if (qty > 0) {
        await tx.query(`UPDATE stock_lots SET quantity_current = 0 WHERE id = $1`, [lotId]);
        await tx.query(
          `INSERT INTO stock_lot_movements (lot_id, quantity_change, reason, reference_type, created_by)
           VALUES ($1, $2, $3, 'DESTROY', $4)`,
          [lotId, -qty, reason, user.id],
        );
      }
    });
  } catch (e) {
    console.error("[discardLot] failed:", e);
    return { error: "Hủy lô thất bại, vui lòng thử lại" };
  }
  await audit({
    userId: user.id,
    action: "lot.discard",
    tableName: "stock_lots",
    rowId: lotId,
    newValue: { reason },
  });
  return {};
}

/** Lịch sử biến động lô từ audit_logs */
export async function getLotHistory(lotId: string): Promise<
  { action: string; created_at: string; user_name: string; new_value: unknown }[]
> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<{
    action: string; created_at: string; user_name: string; new_value: unknown;
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

/* ==================== KIỂM KHO ==================== */

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
}

export async function listStockChecks(): Promise<StockCheckRow[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query(
    `SELECT c.id, c.check_code, c.status, c.note, c.created_at, c.confirmed_at,
            u1.full_name AS created_by_name, u2.full_name AS confirmed_by_name,
            (SELECT COUNT(*) FROM stock_check_items i WHERE i.check_id = c.id) AS item_count
     FROM stock_checks c
     LEFT JOIN users u1 ON u1.id = c.created_by
     LEFT JOIN users u2 ON u2.id = c.confirmed_by
     ORDER BY c.created_at DESC`,
  );
  return rows as StockCheckRow[];
}

export interface StockCheckItemRow {
  id: string;
  lot_id: string;
  lot_code: string;
  herb_name: string;
  system_qty: number;
  actual_qty: number | null;
}

export async function getStockCheck(id: string): Promise<{
  check: StockCheckRow;
  items: StockCheckItemRow[];
} | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const checks = await listStockChecks();
  const check = checks.find((c) => c.id === id);
  if (!check) return null;
  const { rows } = await db.query(
    `SELECT i.id, i.lot_id, l.lot_code, h.name_common AS herb_name,
            i.system_qty, i.actual_qty
     FROM stock_check_items i
     JOIN stock_lots l ON l.id = i.lot_id
     JOIN herbs h ON h.id = l.herb_id
     WHERE i.check_id = $1
     ORDER BY h.name_common`,
    [id],
  );
  return { check, items: rows as StockCheckItemRow[] };
}

/**
 * Tạo phiếu kiểm kho: snapshot tồn hiện tại của các lô được chọn
 * (hoặc tất cả lô còn hàng nếu không chọn).
 */
export async function createStockCheck(
  lotIds: string[],
  note?: string,
): Promise<{ id?: string; error?: string }> {
  const user = await requireRole("admin", "practitioner", "dispenser");
  try {
    let checkId = "";
    await withTransaction(async (tx) => {
      const { rows: seqRows } = await tx.query<{ n: number }>(
        `SELECT next_daily_n('check') AS n`
      );
      const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const code = `KK-${ymd}-${String(seqRows[0].n).padStart(3, "0")}`;
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO stock_checks (check_code, note, created_by)
         VALUES ($1, $2, $3) RETURNING id`,
        [code, note?.trim() || null, user.id],
      );
      checkId = rows[0].id;

      const lots =
        lotIds.length > 0
          ? (
              await tx.query<{ id: string; quantity_current: number }>(
                `SELECT id, quantity_current FROM stock_lots WHERE id = ANY($1)`,
                [lotIds],
              )
            ).rows
          : (
              await tx.query<{ id: string; quantity_current: number }>(
                `SELECT id, quantity_current FROM stock_lots WHERE quantity_current > 0`,
              )
            ).rows;

      for (const l of lots) {
        await tx.query(
          `INSERT INTO stock_check_items (check_id, lot_id, system_qty)
           VALUES ($1, $2, $3)`,
          [checkId, l.id, l.quantity_current],
        );
      }
    });
    return { id: checkId };
  } catch (e) {
    console.error("[createStockCheck] failed:", e);
    return { error: "Tạo phiếu kiểm kho thất bại." };
  }
}

/** Nhập số lượng thực tế cho 1 dòng kiểm kê */
export async function setCheckActual(
  itemId: string,
  actualQty: number,
): Promise<{ error?: string }> {
  await requireRole("admin", "practitioner", "dispenser");
  if (actualQty < 0) return { error: "Số lượng không được âm" };
  const { rowCount } = await db.query(
    `UPDATE stock_check_items i SET actual_qty = $1
     FROM stock_checks c
     WHERE i.id = $2 AND i.check_id = c.id AND c.status = 'draft'`,
    [actualQty, itemId],
  );
  if (rowCount === 0) return { error: "Phiếu đã xác nhận, không sửa được." };
  return {};
}

/**
 * Xác nhận kiểm kho — chống race theo review:
 * lock phiếu + lock tất cả lot, đọc lại tồn hiện tại;
 * nếu khác snapshot → từ chối (stale), không merge mù quáng.
 */
export async function confirmStockCheck(checkId: string): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  try {
    await withTransaction(async (tx) => {
      // 1. Lock phiếu
      const { rows: chk } = await tx.query<{ status: string; check_code: string }>(
        `SELECT status, check_code FROM stock_checks WHERE id = $1 FOR UPDATE`,
        [checkId],
      );
      if (chk.length === 0) throw new Error("NOT_FOUND");
      if (chk[0].status !== "draft") throw new Error("NOT_DRAFT");

      // 2. Lock tất cả lot trong phiếu + đọc tồn hiện tại
      const { rows: items } = await tx.query<{
        id: string; lot_id: string; system_qty: number; actual_qty: number | null;
        current_qty: number;
      }>(
        `SELECT i.id, i.lot_id, i.system_qty, i.actual_qty, l.quantity_current AS current_qty
         FROM stock_check_items i
         JOIN stock_lots l ON l.id = i.lot_id
         WHERE i.check_id = $1 FOR UPDATE OF l`,
        [checkId],
      );

      // 3. Kiểm tra stale
      const stale = items.filter(
        (it) => Number(it.current_qty) !== Number(it.system_qty),
      );
      if (stale.length > 0) {
        throw new Error(`STALE:${stale.length}`);
      }

      // 4. Áp dụng chênh lệch
      for (const it of items) {
        if (it.actual_qty === null) continue;
        const diff = Number(it.actual_qty) - Number(it.system_qty);
        if (diff === 0) continue;
        await tx.query(
          `UPDATE stock_lots SET quantity_current = $1 WHERE id = $2`,
          [it.actual_qty, it.lot_id],
        );
        await tx.query(
          `INSERT INTO stock_lot_movements (lot_id, quantity_change, reason, reference_type, reference_id, created_by)
           VALUES ($1, $2, 'Kiem ke ' || $3, 'STOCK_CHECK', $4, $5)`,
          [it.lot_id, diff, chk[0].check_code, checkId, user.id],
        );
      }

      await tx.query(
        `UPDATE stock_checks SET status = 'confirmed', confirmed_by = $1, confirmed_at = NOW()
         WHERE id = $2`,
        [user.id, checkId],
      );
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return { error: "Không tìm thấy phiếu." };
    if (msg === "NOT_DRAFT") return { error: "Phiếu đã được xử lý." };
    if (msg.startsWith("STALE:")) {
      const n = msg.split(":")[1];
      return {
        error: `Kho đã thay đổi sau khi lập phiếu (${n} lô). Vui lòng tạo phiếu mới để kiểm lại.`,
      };
    }
    console.error("[confirmStockCheck] failed:", e);
    return { error: "Xác nhận thất bại, vui lòng thử lại." };
  }
  await audit({
    userId: user.id,
    action: "stock_check.confirm",
    tableName: "stock_checks",
    rowId: checkId,
  });
  return {};
}

/** Hủy phiếu kiểm kho (chỉ khi draft) */
export async function cancelStockCheck(checkId: string): Promise<{ error?: string }> {
  await requireRole("admin", "practitioner");
  const { rowCount } = await db.query(
    `UPDATE stock_checks SET status = 'cancelled' WHERE id = $1 AND status = 'draft'`,
    [checkId],
  );
  if (rowCount === 0) return { error: "Không thể hủy phiếu ở trạng thái này." };
  return {};
}

/** Lịch sử xuất-nhập của lô từ movements */
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
