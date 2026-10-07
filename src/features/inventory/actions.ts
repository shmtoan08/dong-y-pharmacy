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
  supplier_name: string | null;
  quantity_initial: number;
  quantity_current: number;
  expiry_date: string | null;
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
            h.base_unit, ri.quantity, ri.unit_price, ri.expiry_date, l.lot_code
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
  const items: { herb_id: string; quantity: number; unit_price?: number; expiry_date?: string }[] = [];
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
        `INSERT INTO stock_receipt_items (receipt_id, herb_id, quantity, unit_price, expiry_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [rid, it.herb_id, it.quantity, it.unit_price ?? null, it.expiry_date ?? null],
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
        `SELECT id, herb_id, quantity, expiry_date FROM stock_receipt_items WHERE receipt_id = $1`,
        [id],
      );
      for (const it of items) {
        const lotCode = await nextLotCode(tx);
        const { rows: lotRows } = await tx.query<{ id: string }>(
          `INSERT INTO stock_lots (lot_code, herb_id, supplier_id, quantity_initial, quantity_current, expiry_date)
           VALUES ($1, $2, $3, $4, $4, $5) RETURNING id`,
          [lotCode, it.herb_id, supplierId, it.quantity, it.expiry_date],
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
  expiry?: "expired" | "expiring" | "valid" | "no_expiry";
}): Promise<LotRow[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const conds: string[] = [];
  const params: unknown[] = [];
  if (filter?.herbId) {
    params.push(filter.herbId);
    conds.push(`l.herb_id = $${params.length}`);
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
            h.base_unit, s.name AS supplier_name,
            l.quantity_initial, l.quantity_current, l.expiry_date, l.created_at
     FROM stock_lots l
     JOIN herbs h ON h.id = l.herb_id
     LEFT JOIN suppliers s ON s.id = l.supplier_id
     ${where}
     ORDER BY l.created_at DESC`,
    params,
  );
  return rows;
}
