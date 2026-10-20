import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

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

export interface InvoiceDetail extends InvoiceRow {
  items: { herb_name: string; quantity: number; unit_price: number; line_total: number }[];
  payments: { amount: number; method: string; note: string | null; created_at: string; user_name: string | null }[];
}

export interface InvoiceKpi {
  total_revenue: number;
  total_collected: number;
  total_debt: number;
}

export interface SupplierDebt {
  receipt_id: string;
  receipt_code: string;
  received_at: string;
  total: number;
  paid: number;
  remaining: number;
}

export interface LedgerEntry {
  id: string;
  code: string;
  source: "payment" | "supplier_payment" | "manual";
  created_at: string;
  description: string;
  income: number;
  expense: number;
  method: string;
  user_name: string | null;
  running_balance: number;
  ref_id: string;
}

export interface LedgerSummary {
  opening_balance: number;
  total_income: number;
  total_expense: number;
  closing_balance: number;
}

export interface ManualTxDetail {
  id: string;
  code: string;
  type: "income" | "expense";
  amount: number;
  method: string;
  reason: string;
  person: string | null;
  note: string | null;
  created_at: string;
  user_name: string | null;
}

/**
 * Danh sách hóa đơn có bộ lọc
 */
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
    conds.push(
      `(i.invoice_code ILIKE $${params.length} OR pt.full_name ILIKE $${params.length} OR p.prescription_code ILIKE $${params.length})`,
    );
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
    conds.push(
      `EXISTS (SELECT 1 FROM payments pay WHERE pay.invoice_id = i.id AND pay.method = $${params.length})`,
    );
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

/**
 * Chi tiết một hóa đơn kèm các dòng tiền và thanh toán
 */
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
 * KPI tổng quan hóa đơn
 */
export async function getInvoiceKpi(): Promise<InvoiceKpi> {
  await requireRole("admin", "practitioner", "dispenser", "cashier");
  const { rows } = await db.query(
    `SELECT
       COALESCE(SUM(i.total), 0) AS total_revenue,
       COALESCE(SUM((SELECT COALESCE(SUM(pay.amount), 0) FROM payments pay WHERE pay.invoice_id = i.id)), 0) AS total_collected
     FROM invoices i WHERE i.status != 'cancelled'`,
  );
  const revenue = Number(rows[0]?.total_revenue ?? 0);
  const collected = Number(rows[0]?.total_collected ?? 0);
  return {
    total_revenue: revenue,
    total_collected: collected,
    total_debt: revenue - collected,
  };
}

/**
 * Công nợ nhà cung cấp
 */
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

function ledgerRange(from?: string, to?: string) {
  const f = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
  let t = to ? new Date(to) : new Date();
  if (t.getTime() - f.getTime() > 366 * 24 * 3600 * 1000) {
    t = new Date(f.getTime() + 366 * 24 * 3600 * 1000);
  }
  return {
    from: f.toISOString(),
    to: new Date(t.getTime() + 24 * 3600 * 1000).toISOString(),
  };
}

const UNION_SQL = `
  SELECT pay.id AS ref_id, pay.id, 'payment' AS source, 'PT-' || i.invoice_code AS code,
         pay.created_at, 'Thu HĐ ' || i.invoice_code AS description,
         pay.amount AS income, 0 AS expense, pay.amount AS signed,
         pay.method, u.full_name AS user_name
  FROM payments pay
  JOIN invoices i ON i.id = pay.invoice_id
  LEFT JOIN users u ON u.id = pay.created_by
  UNION ALL
  SELECT sp.id AS ref_id, sp.id, 'supplier_payment' AS source, 'PC-' || r.receipt_code AS code,
         sp.created_at, 'Trả NCC ' || r.receipt_code AS description,
         0 AS income, sp.amount AS expense, -sp.amount AS signed,
         sp.method, u.full_name AS user_name
  FROM supplier_payments sp
  JOIN stock_receipts r ON r.id = sp.receipt_id
  LEFT JOIN users u ON u.id = sp.created_by
  UNION ALL
  SELECT mt.id AS ref_id, mt.id, 'manual' AS source, mt.code,
         mt.created_at, mt.reason AS description,
         CASE WHEN mt.type = 'income' THEN mt.amount ELSE 0 END AS income,
         CASE WHEN mt.type = 'expense' THEN mt.amount ELSE 0 END AS expense,
         CASE WHEN mt.type = 'income' THEN mt.amount ELSE -mt.amount END AS signed,
         mt.method, u.full_name AS user_name
  FROM manual_transactions mt
  LEFT JOIN users u ON u.id = mt.created_by
`;

/**
 * Lấy dữ liệu sổ quỹ thu - chi
 */
export async function getLedger(
  from?: string,
  to?: string,
  type?: "income" | "expense",
  q?: string,
  method?: string,
): Promise<{ entries: LedgerEntry[]; summary: LedgerSummary }> {
  await requireRole("admin");
  const r = ledgerRange(from, to);

  const { rows: openRows } = await db.query<{ balance: number }>(
    `SELECT COALESCE(SUM(signed), 0) AS balance FROM (${UNION_SQL}) t WHERE t.created_at < $1`,
    [r.from],
  );
  const opening_balance = Number(openRows[0]?.balance ?? 0);

  const conds = [`t.created_at >= $1`, `t.created_at < $2`];
  const params: unknown[] = [r.from, r.to];

  if (type === "income") {
    conds.push("t.income > 0");
  } else if (type === "expense") {
    conds.push("t.expense > 0");
  }

  if (q?.trim()) {
    params.push(`%${q.trim()}%`);
    conds.push(`(t.code ILIKE $${params.length} OR t.description ILIKE $${params.length})`);
  }

  if (method) {
    params.push(method);
    conds.push(`t.method = $${params.length}`);
  }

  const { rows } = await db.query<Omit<LedgerEntry, "running_balance">>(
    `SELECT t.id, t.code, t.source, t.created_at, t.description,
            t.income, t.expense, t.method, t.user_name, t.ref_id
     FROM (${UNION_SQL}) t
     WHERE ${conds.join(" AND ")}
     ORDER BY t.created_at ASC`,
    params,
  );

  let run = opening_balance;
  let total_income = 0;
  let total_expense = 0;

  const entries: LedgerEntry[] = rows.map((r) => {
    const inc = Number(r.income);
    const exp = Number(r.expense);
    total_income += inc;
    total_expense += exp;
    run += inc - exp;
    return {
      ...r,
      income: inc,
      expense: exp,
      running_balance: run,
    };
  });

  return {
    entries: entries.reverse(),
    summary: {
      opening_balance,
      total_income,
      total_expense,
      closing_balance: run,
    },
  };
}

/**
 * Chi tiết phiếu thu/chi thủ công
 */
export async function getManualTransaction(id: string): Promise<ManualTxDetail | null> {
  await requireRole("admin");
  const { rows } = await db.query<ManualTxDetail>(
    `SELECT mt.id, mt.code, mt.type, mt.amount, mt.method, mt.reason, mt.person, mt.note,
            mt.created_at, u.full_name AS user_name
     FROM manual_transactions mt
     LEFT JOIN users u ON u.id = mt.created_by
     WHERE mt.id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  return { ...rows[0], amount: Number(rows[0].amount) };
}
