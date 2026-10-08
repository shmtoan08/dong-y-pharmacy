"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

function range(from?: string, to?: string) {
  // Giới hạn tối đa 1 năm
  const f = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
  let t = to ? new Date(to) : new Date();
  if (t.getTime() - f.getTime() > 366 * 24 * 3600 * 1000) {
    t = new Date(f.getTime() + 366 * 24 * 3600 * 1000);
  }
  return {
    from: f.toISOString(),
    to: new Date(t.getTime() + 24 * 3600 * 1000).toISOString(), // < to+1day
  };
}

/* ==================== DOANH THU ==================== */

export interface RevenueKpi {
  total_revenue: number;
  total_collected: number;
  total_debt: number;
  invoice_count: number;
  unpaid_count: number;
}

export async function getRevenueKpi(from?: string, to?: string): Promise<RevenueKpi> {
  await requireRole("admin");
  const r = range(from, to);
  const { rows } = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN i.status != 'cancelled' THEN i.total ELSE 0 END), 0) AS total_revenue,
       COALESCE(SUM((SELECT COALESCE(SUM(pay.amount), 0) FROM payments pay WHERE pay.invoice_id = i.id)), 0) AS total_collected,
       COUNT(*) FILTER (WHERE i.status != 'cancelled') AS invoice_count,
       COUNT(*) FILTER (WHERE i.status IN ('unpaid', 'partial')) AS unpaid_count
     FROM invoices i
     WHERE i.created_at >= $1 AND i.created_at < $2`,
    [r.from, r.to],
  );
  const revenue = Number(rows[0].total_revenue);
  const collected = Number(rows[0].total_collected);
  return {
    total_revenue: revenue,
    total_collected: collected,
    total_debt: revenue - collected,
    invoice_count: Number(rows[0].invoice_count),
    unpaid_count: Number(rows[0].unpaid_count),
  };
}

export interface RevenueTrend {
  date: string;
  revenue: number;
  collected: number;
}

export async function getRevenueTrend(from?: string, to?: string, group: "day" | "week" | "month" = "day"): Promise<RevenueTrend[]> {
  await requireRole("admin");
  const r = range(from, to);
  const trunc = group === "week" ? "week" : group === "month" ? "month" : "day";
  const { rows } = await db.query(
    `SELECT to_char(date_trunc($3, i.created_at), 'YYYY-MM-DD') AS date,
            COALESCE(SUM(CASE WHEN i.status != 'cancelled' THEN i.total ELSE 0 END), 0) AS revenue,
            COALESCE(SUM((SELECT COALESCE(SUM(pay.amount), 0) FROM payments pay WHERE pay.invoice_id = i.id)), 0) AS collected
     FROM invoices i
     WHERE i.created_at >= $1 AND i.created_at < $2
     GROUP BY 1 ORDER BY 1`,
    [r.from, r.to, trunc],
  );
  return rows.map((x) => ({
    date: x.date,
    revenue: Number(x.revenue),
    collected: Number(x.collected),
  }));
}

/* ==================== TIÊU HAO DƯỢC LIỆU ==================== */

export interface HerbUsage {
  herb_id: string | null;
  herb_name: string;
  dispensed_qty: number;
  current_stock: number;
  unit: string;
}

export async function getTopHerbUsage(from?: string, to?: string, limit = 15): Promise<HerbUsage[]> {
  await requireRole("admin");
  const r = range(from, to);
  const { rows } = await db.query(
    `SELECT l.herb_id, h.name_common AS herb_name,
            COALESCE(SUM(ABS(m.quantity_change)), 0) AS dispensed_qty,
            COALESCE((SELECT SUM(l2.quantity_current) FROM stock_lots l2 WHERE l2.herb_id = l.herb_id), 0) AS current_stock,
            COALESCE(h.base_unit, '') AS unit
     FROM stock_lot_movements m
     JOIN stock_lots l ON l.id = m.lot_id
     LEFT JOIN herbs h ON h.id = l.herb_id
     WHERE m.reason = 'dispense' AND m.created_at >= $1 AND m.created_at < $2
     GROUP BY l.herb_id, h.name_common, h.base_unit
     ORDER BY dispensed_qty DESC
     LIMIT $3`,
    [r.from, r.to, limit],
  );
  return rows.map((x) => ({
    herb_id: x.herb_id,
    herb_name: x.herb_name,
    dispensed_qty: Number(x.dispensed_qty),
    current_stock: Number(x.current_stock),
    unit: x.unit,
  }));
}

export interface LowStockHerb {
  id: string;
  name_common: string;
  code: string;
  stock: number;
  unit: string;
  expiring_lots: number;
}

export async function getLowStockHerbs(): Promise<LowStockHerb[]> {
  await requireRole("admin");
  const { rows } = await db.query(
    `SELECT h.id, h.name_common, h.code, h.base_unit,
            COALESCE((SELECT SUM(l.quantity_current) FROM stock_lots l WHERE l.herb_id = h.id), 0) AS stock,
            (SELECT COUNT(*) FROM stock_lots l
             WHERE l.herb_id = h.id AND l.quantity_current > 0
               AND l.expiry_date IS NOT NULL
               AND l.expiry_date <= NOW() + interval '30 days') AS expiring_lots
     FROM herbs h
     WHERE h.is_active = true
     ORDER BY stock ASC
     LIMIT 20`,
  );
  return rows.map((x) => ({
    id: x.id,
    name_common: x.name_common,
    code: x.code,
    stock: Number(x.stock),
    unit: x.unit,
    expiring_lots: Number(x.expiring_lots),
  }));
}

/* ==================== LƯỢT KHÁM ==================== */

export interface VisitKpi {
  total_visits: number;
  new_patients: number;
  returning_patients: number;
  return_rate: number;
}

export async function getVisitKpi(from?: string, to?: string): Promise<VisitKpi> {
  await requireRole("admin");
  const r = range(from, to);
  const { rows } = await db.query(
    `WITH period_visits AS (
       SELECT DISTINCT patient_id FROM visits
       WHERE visited_at >= $1 AND visited_at < $2
     ),
     first_visits AS (
       SELECT patient_id, MIN(visited_at) AS first_date FROM visits GROUP BY patient_id
     )
     SELECT
       (SELECT COUNT(*) FROM visits WHERE visited_at >= $1 AND visited_at < $2) AS total_visits,
       (SELECT COUNT(*) FROM period_visits pv JOIN first_visits fv ON fv.patient_id = pv.patient_id
        WHERE fv.first_date >= $1 AND fv.first_date < $2) AS new_patients,
       (SELECT COUNT(DISTINCT patient_id) FROM period_visits) AS unique_patients`,
    [r.from, r.to],
  );
  const total = Number(rows[0].total_visits);
  const newP = Number(rows[0].new_patients);
  const unique = Number(rows[0].unique_patients);
  return {
    total_visits: total,
    new_patients: newP,
    returning_patients: Math.max(0, unique - newP),
    return_rate: unique > 0 ? Math.round(((unique - newP) / unique) * 100) : 0,
  };
}

export interface VisitTrend {
  date: string;
  visits: number;
}

export async function getVisitTrend(from?: string, to?: string, group: "day" | "week" | "month" = "day"): Promise<VisitTrend[]> {
  await requireRole("admin");
  const r = range(from, to);
  const trunc = group === "week" ? "week" : group === "month" ? "month" : "day";
  const { rows } = await db.query(
    `SELECT to_char(date_trunc($3, visited_at), 'YYYY-MM-DD') AS date, COUNT(*) AS visits
     FROM visits
     WHERE visited_at >= $1 AND visited_at < $2
     GROUP BY 1 ORDER BY 1`,
    [r.from, r.to, trunc],
  );
  return rows.map((x) => ({ date: x.date, visits: Number(x.visits) }));
}
