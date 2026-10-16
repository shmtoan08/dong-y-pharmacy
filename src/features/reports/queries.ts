import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import type { PrescriptionStatus } from "@/features/prescriptions/constants";

export interface DashboardOverview {
  todayVisitsCount: number;
  pendingPrescriptionsCount: number;
  totalPatientsCount: number;
  activeHerbsCount: number;
  recentVisits: Array<{
    id: string;
    visited_at: string;
    full_name: string;
    patient_code: string;
  }>;
  recentPrescriptions: Array<{
    id: string;
    prescription_code: string;
    status: PrescriptionStatus;
    num_of_packs: number;
    full_name: string;
  }>;
}

/**
 * Lấy dữ liệu tổng quan cho trang chủ Dashboard
 */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  await requireUser();

  const [
    { rows: s1 },
    { rows: s2 },
    { rows: s3 },
    { rows: s4 },
    { rows: recentVisits },
    { rows: recentPrescriptions },
  ] = await Promise.all([
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM visits WHERE visited_at::date = CURRENT_DATE`,
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM prescriptions WHERE status IN ('draft','confirmed')`,
    ),
    db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM patients`),
    db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM herbs WHERE is_active = true`),
    db.query<{ id: string; visited_at: string; full_name: string; patient_code: string }>(
      `SELECT v.id, v.visited_at, p.full_name, p.patient_code
       FROM visits v JOIN patients p ON p.id = v.patient_id
       ORDER BY v.visited_at DESC LIMIT 5`,
    ),
    db.query<{
      id: string;
      prescription_code: string;
      status: PrescriptionStatus;
      num_of_packs: number;
      full_name: string;
    }>(
      `SELECT pr.id, pr.prescription_code, pr.status, pr.num_of_packs, p.full_name
       FROM prescriptions pr
       JOIN visits v ON v.id = pr.visit_id
       JOIN patients p ON p.id = v.patient_id
       ORDER BY pr.created_at DESC LIMIT 5`,
    ),
  ]);

  return {
    todayVisitsCount: Number(s1[0]?.count ?? 0),
    pendingPrescriptionsCount: Number(s2[0]?.count ?? 0),
    totalPatientsCount: Number(s3[0]?.count ?? 0),
    activeHerbsCount: Number(s4[0]?.count ?? 0),
    recentVisits,
    recentPrescriptions,
  };
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
  const revenue = Number(rows[0]?.total_revenue ?? 0);
  const collected = Number(rows[0]?.total_collected ?? 0);
  return {
    total_revenue: revenue,
    total_collected: collected,
    total_debt: revenue - collected,
    invoice_count: Number(rows[0]?.invoice_count ?? 0),
    unpaid_count: Number(rows[0]?.unpaid_count ?? 0),
  };
}
