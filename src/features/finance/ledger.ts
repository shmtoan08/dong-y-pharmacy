"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

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

function range(from?: string, to?: string) {
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

export async function getLedger(
  from?: string,
  to?: string,
  type?: "income" | "expense",
  q?: string,
  method?: string,
): Promise<{ entries: LedgerEntry[]; summary: LedgerSummary }> {
  await requireRole("admin");
  const r = range(from, to);

  const { rows: openRows } = await db.query<{ balance: number }>(
    `SELECT COALESCE(SUM(signed), 0) AS balance FROM (${UNION_SQL}) t WHERE t.created_at < $1`,
    [r.from],
  );
  const opening = Number(openRows[0].balance);

  const conds = [`t.created_at >= $2`, `t.created_at < $3`];
  const params: unknown[] = [opening, r.from, r.to];
  if (q) {
    params.push(`%${q}%`);
    conds.push(`(t.code ILIKE $${params.length} OR t.description ILIKE $${params.length} OR t.user_name ILIKE $${params.length})`);
  }
  if (method) {
    params.push(method);
    conds.push(`t.method = $${params.length}`);
  }

  const { rows } = await db.query(
    `SELECT *, $1 + SUM(signed) OVER (ORDER BY created_at, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
     FROM (${UNION_SQL}) t
     WHERE ${conds.join(" AND ")}
     ORDER BY t.created_at, t.id`,
    params,
  );

  let entries = rows.map((x) => ({
    id: `${x.source}-${x.id}`,
    code: x.code,
    source: x.source as "payment" | "supplier_payment" | "manual",
    created_at: x.created_at,
    description: x.description,
    income: Number(x.income),
    expense: Number(x.expense),
    method: x.method,
    user_name: x.user_name,
    running_balance: Number(x.running_balance),
    ref_id: x.ref_id,
  }));

  if (type === "income") entries = entries.filter((e) => e.income > 0);
  if (type === "expense") entries = entries.filter((e) => e.expense > 0);

  const { rows: sumRows } = await db.query<{ income: number; expense: number }>(
    `SELECT COALESCE(SUM(income), 0) AS income, COALESCE(SUM(expense), 0) AS expense
     FROM (${UNION_SQL}) t WHERE t.created_at >= $1 AND t.created_at < $2`,
    [r.from, r.to],
  );
  const realIncome = Number(sumRows[0].income);
  const realExpense = Number(sumRows[0].expense);

  return {
    entries,
    summary: {
      opening_balance: opening,
      total_income: realIncome,
      total_expense: realExpense,
      closing_balance: opening + realIncome - realExpense,
    },
  };
}

/** Tạo phiếu thu/chi thủ công */
export async function createManualTransaction(data: {
  type: "income" | "expense";
  amount: number;
  reason: string;
  person?: string;
  method: "cash" | "transfer";
  note?: string;
}): Promise<{ id?: string; error?: string }> {
  const user = await requireRole("admin");
  if (data.amount <= 0) return { error: "Số tiền phải dương." };
  if (!data.reason.trim()) return { error: "Chưa nhập lý do." };

  const today = new Date().toISOString().slice(0, 10);
  const prefix = data.type === "income" ? "PTM" : "PCM";
  const { rows: seq } = await db.query<{ next_daily_n: number }>(
    `SELECT next_daily_n($1, $2)`,
    [today, `manual_${data.type}`],
  );
  const code = `${prefix}-${today.replace(/-/g, "")}-${String(seq[0].next_daily_n).padStart(3, "0")}`;

  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO manual_transactions (code, type, amount, reason, person, method, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [code, data.type, data.amount, data.reason.trim(), data.person?.trim() || null, data.method, data.note?.trim() || null, user.id],
  );

  await audit({ userId: user.id, action: "MANUAL_TX_CREATE", tableName: "manual_transactions", rowId: rows[0].id });
  return { id: rows[0].id };
}

export interface ManualTxDetail {
  id: string;
  code: string;
  type: "income" | "expense";
  amount: number;
  reason: string;
  person: string | null;
  method: string;
  note: string | null;
  created_at: string;
  user_name: string | null;
}

export async function getManualTransaction(id: string): Promise<ManualTxDetail | null> {
  await requireRole("admin");
  const { rows } = await db.query(
    `SELECT mt.id, mt.code, mt.type, mt.amount, mt.reason, mt.person, mt.method, mt.note, mt.created_at,
            u.full_name AS user_name
     FROM manual_transactions mt
     LEFT JOIN users u ON u.id = mt.created_by
     WHERE mt.id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id, code: r.code, type: r.type, amount: Number(r.amount),
    reason: r.reason, person: r.person, method: r.method, note: r.note,
    created_at: r.created_at, user_name: r.user_name,
  };
}
