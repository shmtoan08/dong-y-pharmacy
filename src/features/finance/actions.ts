"use server";

import { db, withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

/* ==================== HÓA ĐƠN ==================== */

export interface InvoiceRow {
  id: string;
  invoice_code: string;
  prescription_id: string;
  prescription_code: string;
  patient_name: string;
  patient_phone: string | null;
  status: "unpaid" | "partial" | "paid" | "cancelled";
  subtotal: number;
  discount: number;
  total: number;
  paid_total: number;
  remaining: number;
  created_at: string;
}

export async function listInvoices(filter?: {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  method?: string;
}): Promise<InvoiceRow[]> {
  await requireRole("admin", "practitioner", "dispenser", "cashier");
  const conds: string[] = [];
  const params: unknown[] = [];
  if (filter?.q) {
    params.push(`%${filter.q}%`);
    conds.push(`(i.invoice_code ILIKE $${params.length} OR pt.full_name ILIKE $${params.length} OR p.prescription_code ILIKE $${params.length})`);
  }
  if (filter?.status) {
    params.push(filter.status);
    conds.push(`i.status = $${params.length}`);
  }
  if (filter?.from) {
    params.push(filter.from);
    conds.push(`i.created_at >= $${params.length}::timestamptz`);
  }
  if (filter?.to) {
    params.push(filter.to);
    conds.push(`i.created_at < ($${params.length}::date + interval '1 day')`);
  }
  if (filter?.method) {
    params.push(filter.method);
    conds.push(`EXISTS (SELECT 1 FROM payments pay WHERE pay.invoice_id = i.id AND pay.method = $${params.length})`);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";
  const { rows } = await db.query(
    `SELECT i.id, i.invoice_code, i.prescription_id, p.prescription_code,
            pt.full_name AS patient_name, pt.phone AS patient_phone, i.status, i.subtotal, i.discount, i.total,
            COALESCE((SELECT SUM(pay.amount) FROM payments pay WHERE pay.invoice_id = i.id), 0) AS paid_total,
            i.total - COALESCE((SELECT SUM(pay.amount) FROM payments pay WHERE pay.invoice_id = i.id), 0) AS remaining,
            i.created_at
     FROM invoices i
     JOIN prescriptions p ON p.id = i.prescription_id
     JOIN visits v ON v.id = p.visit_id
     JOIN patients pt ON pt.id = v.patient_id
     ${where}
     ORDER BY i.created_at DESC`,
    params,
  );
  return rows as InvoiceRow[];
}

export interface InvoiceDetail extends InvoiceRow {
  items: { herb_name: string; quantity: number; unit_price: number; line_total: number }[];
  payments: { amount: number; method: string; note: string | null; created_at: string; user_name: string | null }[];
}

export async function getInvoice(id: string): Promise<InvoiceDetail | null> {
  await requireRole("admin", "practitioner", "dispenser", "cashier");
  const list = await listInvoices();
  const inv = list.find((x) => x.id === id);
  if (!inv) return null;
  const { rows: items } = await db.query(
    `SELECT herb_name, quantity, unit_price, line_total FROM invoice_items WHERE invoice_id = $1 ORDER BY herb_name`,
    [id],
  );
  const { rows: payments } = await db.query(
    `SELECT pay.amount, pay.method, pay.note, pay.created_at, u.full_name AS user_name
     FROM payments pay LEFT JOIN users u ON u.id = pay.created_by
     WHERE pay.invoice_id = $1 ORDER BY pay.created_at`,
    [id],
  );
  return { ...inv, items, payments } as InvoiceDetail;
}

/**
 * Lập hóa đơn từ đơn thuốc đã bốc (completed).
 * Snapshot giá tại thời điểm lập.
 */
export async function createInvoice(
  prescriptionId: string,
  discount: number,
  priceOverrides?: Record<string, number>,
): Promise<{ id?: string; error?: string }> {
  const user = await requireRole("admin", "practitioner", "cashier");
  if (discount < 0) return { error: "Chiết khấu không được âm." };

  try {
    let invoiceId = "";
    await withTransaction(async (tx) => {
      // Lock đơn + check completed
      const { rows: pr } = await tx.query<{ num_of_packs: number; status: string }>(
        `SELECT num_of_packs, status FROM prescriptions WHERE id = $1 FOR UPDATE`,
        [prescriptionId],
      );
      if (pr.length === 0) throw new Error("NOT_FOUND");
      if (pr[0].status !== "completed") throw new Error("NOT_COMPLETED");
      const numPacks = Number(pr[0].num_of_packs) || 1;

      // Check đã có hóa đơn chưa
      const { rows: ex } = await tx.query(
        `SELECT id FROM invoices WHERE prescription_id = $1`,
        [prescriptionId],
      );
      if (ex.length > 0) throw new Error("ALREADY_INVOICED");

      // Lấy items + giá (fallback khớp tên nếu herb_id NULL)
      const { rows: items } = await tx.query<{
        id: string; herb_id: string | null; herb_name: string; herb_name_key: string | null;
        weight_per_pack: number; price_per_unit: number | null;
      }>(
        `SELECT pi.id, pi.herb_id, pi.herb_name, pi.herb_name_key, pi.weight_per_pack,
                COALESCE(h1.price_per_unit, h2.price_per_unit) AS price_per_unit
         FROM prescription_items pi
         LEFT JOIN herbs h1 ON h1.id = pi.herb_id
         LEFT JOIN herbs h2 ON h2.canonical_key = pi.herb_name_key AND pi.herb_id IS NULL
         WHERE pi.prescription_id = $1`,
        [prescriptionId],
      );

      const today = new Date().toISOString().slice(0, 10);
      const { rows: seq } = await tx.query<{ next_daily_n: number }>(
        `SELECT next_daily_n($1, 'invoice')`,
        [today],
      );
      const code = `HD-${today.replace(/-/g, "")}-${String(seq[0].next_daily_n).padStart(3, "0")}`;

      let subtotal = 0;
      const lines: { itemId: string; herbName: string; qty: number; price: number; total: number }[] = [];
      for (const it of items) {
        const qty = Number(it.weight_per_pack) * numPacks;
        const price = priceOverrides?.[it.id] ?? Number(it.price_per_unit ?? 0);
        if (price < 0) throw new Error("NEGATIVE_PRICE");
        const lineTotal = Math.round(qty * price * 100) / 100;
        subtotal += lineTotal;
        lines.push({ itemId: it.id, herbName: it.herb_name, qty, price, total: lineTotal });
      }
      subtotal = Math.round(subtotal * 100) / 100;
      if (discount > subtotal) throw new Error("DISCOUNT_EXCEEDS");
      const total = Math.round((subtotal - discount) * 100) / 100;

      const { rows: inv } = await tx.query<{ id: string }>(
        `INSERT INTO invoices (invoice_code, prescription_id, subtotal, discount, total, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [code, prescriptionId, subtotal, discount, total, user.id],
      );
      invoiceId = inv[0].id;

      for (const l of lines) {
        await tx.query(
          `INSERT INTO invoice_items (invoice_id, prescription_item_id, herb_name, quantity, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [invoiceId, l.itemId, l.herbName, l.qty, l.price, l.total],
        );
      }
    });

    await audit({ userId: user.id, action: "INVOICE_CREATE", tableName: "invoices", rowId: invoiceId });
    return { id: invoiceId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return { error: "Không tìm thấy đơn thuốc." };
    if (msg === "NOT_COMPLETED") return { error: "Chỉ lập hóa đơn cho đơn đã bốc thuốc." };
    if (msg === "ALREADY_INVOICED") return { error: "Đơn này đã có hóa đơn." };
    if (msg === "DISCOUNT_EXCEEDS") return { error: "Chiết khấu không được vượt tổng tiền." };
    if (msg === "NEGATIVE_PRICE") return { error: "Đơn giá không được âm." };
    console.error("[createInvoice] failed:", e);
    return { error: "Lập hóa đơn thất bại." };
  }
}

/**
 * Thu tiền — transaction + FOR UPDATE, chặn thu vượt.
 * payments là source of truth.
 */
export async function recordPayment(
  invoiceId: string,
  amount: number,
  method: "cash" | "transfer",
  note?: string,
): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner", "cashier");
  if (amount <= 0) return { error: "Số tiền phải dương." };

  try {
    await withTransaction(async (tx) => {
      const { rows } = await tx.query<{ total: number; status: string }>(
        `SELECT total, status FROM invoices WHERE id = $1 FOR UPDATE`,
        [invoiceId],
      );
      if (rows.length === 0) throw new Error("NOT_FOUND");
      if (rows[0].status === "cancelled") throw new Error("CANCELLED");
      if (rows[0].status === "paid") throw new Error("ALREADY_PAID");

      const { rows: payRows } = await tx.query<{ s: number }>(
        `SELECT COALESCE(SUM(amount), 0) AS s FROM payments WHERE invoice_id = $1`,
        [invoiceId],
      );
      const paidSoFar = Number(payRows[0].s);
      const remaining = Number(rows[0].total) - paidSoFar;
      if (amount > remaining + 0.01) throw new Error(`EXCEEDS:${remaining}`);

      await tx.query(
        `INSERT INTO payments (invoice_id, amount, method, note, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [invoiceId, amount, method, note?.trim() || null, user.id],
      );

      const newPaid = paidSoFar + amount;
      const newStatus = newPaid >= Number(rows[0].total) - 0.01 ? "paid" : "partial";
      await tx.query(
        `UPDATE invoices SET status = $1, paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END
         WHERE id = $2`,
        [newStatus, invoiceId],
      );
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return { error: "Không tìm thấy hóa đơn." };
    if (msg === "CANCELLED") return { error: "Hóa đơn đã hủy, không thu được." };
    if (msg === "ALREADY_PAID") return { error: "Hóa đơn đã thanh toán đủ." };
    if (msg.startsWith("EXCEEDS:")) {
      const rem = Number(msg.split(":")[1]).toLocaleString("vi-VN");
      return { error: `Số tiền vượt quá số còn lại (${rem}đ).` };
    }
    console.error("[recordPayment] failed:", e);
    return { error: "Thu tiền thất bại." };
  }

  await audit({ userId: user.id, action: "PAYMENT_RECORD", tableName: "invoices", rowId: invoiceId, newValue: { amount, method } });
  return {};
}

export async function cancelInvoice(id: string): Promise<{ error?: string }> {
  const user = await requireRole("admin");
  const { rowCount } = await db.query(
    `UPDATE invoices SET status = 'cancelled' WHERE id = $1 AND status IN ('unpaid', 'partial')`,
    [id],
  );
  if (rowCount === 0) return { error: "Không thể hủy hóa đơn ở trạng thái này." };
  await audit({ userId: user.id, action: "INVOICE_CANCEL", tableName: "invoices", rowId: id });
  return {};
}

/* ==================== CÔNG NỢ NCC ==================== */

export interface SupplierDebt {
  receipt_id: string;
  receipt_code: string;
  received_at: string;
  total: number;
  paid: number;
  remaining: number;
}

export async function getSupplierDebt(supplierId: string): Promise<{
  receipts: SupplierDebt[];
  total_debt: number;
  total_paid: number;
}> {
  await requireRole("admin", "practitioner");
  const { rows } = await db.query(
    `SELECT r.id AS receipt_id, r.receipt_code, r.received_at,
            COALESCE((SELECT SUM(ri.quantity * ri.unit_price) FROM stock_receipt_items ri WHERE ri.receipt_id = r.id), 0) AS total,
            COALESCE((SELECT SUM(sp.amount) FROM supplier_payments sp WHERE sp.receipt_id = r.id), 0) AS paid
     FROM stock_receipts r
     WHERE r.supplier_id = $1 AND r.status = 'confirmed'
     ORDER BY r.received_at DESC`,
    [supplierId],
  );
  const receipts = rows.map((r) => ({
    receipt_id: r.receipt_id,
    receipt_code: r.receipt_code,
    received_at: r.received_at,
    total: Number(r.total),
    paid: Number(r.paid),
    remaining: Number(r.total) - Number(r.paid),
  }));
  return {
    receipts,
    total_debt: receipts.reduce((s, r) => s + r.remaining, 0),
    total_paid: receipts.reduce((s, r) => s + r.paid, 0),
  };
}

/** Thanh toán cho 1 phiếu nhập (1:1) */
export async function paySupplierReceipt(
  receiptId: string,
  amount: number,
  method: "cash" | "transfer",
  note?: string,
): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  if (amount <= 0) return { error: "Số tiền phải dương." };

  try {
    await withTransaction(async (tx) => {
      const { rows } = await tx.query<{ supplier_id: string; total: number; status: string }>(
        `SELECT r.supplier_id, r.status,
                COALESCE((SELECT SUM(ri.quantity * ri.unit_price) FROM stock_receipt_items ri WHERE ri.receipt_id = r.id), 0) AS total
         FROM stock_receipts r WHERE r.id = $1 FOR UPDATE`,
        [receiptId],
      );
      if (rows.length === 0) throw new Error("NOT_FOUND");
      if (rows[0].status !== "confirmed") throw new Error("NOT_CONFIRMED");

      const { rows: pr } = await tx.query<{ s: number }>(
        `SELECT COALESCE(SUM(amount), 0) AS s FROM supplier_payments WHERE receipt_id = $1`,
        [receiptId],
      );
      const remaining = Number(rows[0].total) - Number(pr[0].s);
      if (amount > remaining + 0.01) throw new Error(`EXCEEDS:${remaining}`);

      await tx.query(
        `INSERT INTO supplier_payments (supplier_id, receipt_id, amount, method, note, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [rows[0].supplier_id, receiptId, amount, method, note?.trim() || null, user.id],
      );
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return { error: "Không tìm thấy phiếu nhập." };
    if (msg === "NOT_CONFIRMED") return { error: "Chỉ thanh toán phiếu đã xác nhận." };
    if (msg.startsWith("EXCEEDS:")) {
      return { error: `Vượt số còn nợ (${Number(msg.split(":")[1]).toLocaleString("vi-VN")}đ).` };
    }
    console.error("[paySupplierReceipt] failed:", e);
    return { error: "Thanh toán thất bại." };
  }

  await audit({ userId: user.id, action: "SUPPLIER_PAYMENT", tableName: "stock_receipts", rowId: receiptId, newValue: { amount, method } });
  return {};
}


export interface InvoiceKpi {
  total_revenue: number;
  total_collected: number;
  total_debt: number;
}

export async function getInvoiceKpi(): Promise<InvoiceKpi> {
  await requireRole("admin", "practitioner", "dispenser", "cashier");
  const { rows } = await db.query(
    `SELECT
       COALESCE(SUM(i.total), 0) AS total_revenue,
       COALESCE(SUM((SELECT COALESCE(SUM(pay.amount), 0) FROM payments pay WHERE pay.invoice_id = i.id)), 0) AS total_collected
     FROM invoices i WHERE i.status != 'cancelled'`,
  );
  const revenue = Number(rows[0].total_revenue);
  const collected = Number(rows[0].total_collected);
  return { total_revenue: revenue, total_collected: collected, total_debt: revenue - collected };
}
