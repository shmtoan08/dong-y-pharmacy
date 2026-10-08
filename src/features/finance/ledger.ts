"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export interface LedgerEntry {
  id: string;
  source: "payment" | "supplier_payment";
  created_at: string;
  description: string;
  income: number;
  expense: number;
  user_name: string | null;
  running_balance: number;
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
  SELECT pay.id, 'payment' AS source, pay.created_at,
         'Thu HĐ ' || i.invoice_code AS description,
         pay.amount AS income, 0 AS expense, pay.amount AS signed,
         u.full_name AS user_name
  FROM payments pay
  JOIN invoices i ON i.id = pay.invoice_id
  LEFT JOIN users u ON u.id = pay.created_by
  UNION ALL
  SELECT sp.id, 'supplier_payment' AS source, sp.created_at,
         'Trả NCC ' || r.receipt_code AS description,
         0 AS income, sp.amount AS expense, -sp.amount AS signed,
         u.full_name AS user_name
  FROM supplier_payments sp
  JOIN stock_receipts r ON r.id = sp.receipt_id
  LEFT JOIN users u ON u.id = sp.created_by
`;

export async function getLedger(
  from?: string,
  to?: string,
  type?: "income" | "expense",
): Promise<{ entries: LedgerEntry[]; summary: LedgerSummary }> {
  await requireRole("admin");
  const r = range(from, to);

  // Số dư đầu kỳ: tất cả giao dịch trước from
  const { rows: openRows } = await db.query<{ balance: number }>(
    `SELECT COALESCE(SUM(signed), 0) AS balance FROM (${UNION_SQL}) t WHERE t.created_at < $1`,
    [r.from],
  );
  const opening = Number(openRows[0].balance);

  // Tất cả giao dịch trong kỳ (để tính running balance đúng)
  const { rows } = await db.query(
    `SELECT *, $1 + SUM(signed) OVER (ORDER BY created_at, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
     FROM (${UNION_SQL}) t
     WHERE t.created_at >= $2 AND t.created_at < $3
     ORDER BY t.created_at, t.id`,
    [opening, r.from, r.to],
  );

  let entries = rows.map((x) => ({
    id: `${x.source}-${x.id}`,
    source: x.source as "payment" | "supplier_payment",
    created_at: x.created_at,
    description: x.description,
    income: Number(x.income),
    expense: Number(x.expense),
    user_name: x.user_name,
    running_balance: Number(x.running_balance),
  }));

  // Lọc hiển thị (không ảnh hưởng running balance)
  if (type === "income") entries = entries.filter((e) => e.income > 0);
  if (type === "expense") entries = entries.filter((e) => e.expense > 0);

  const totalIncome = entries.reduce((s, e) => s + e.income, 0);
  const totalExpense = entries.reduce((s, e) => s + e.expense, 0);

  // Tổng thu/chi thực trong kỳ (không lọc)
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
