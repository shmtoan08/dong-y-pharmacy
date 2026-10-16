import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export interface PulsePattern {
  id: string;
  name_viet: string;
  name_han_viet: string;
  description: string;
}

export interface VisitRow {
  id: string;
  patient_id: string;
  visited_at: string;
  final_diagnosis: string | null;
  practitioner_name: string;
}

export interface VisitDetailPulse {
  hand: string;
  position: string;
  pattern_name: string | null;
  custom_note: string | null;
}

export interface VisitDetail {
  id: string;
  visited_at: string;
  inspection_notes: string | null;
  auscultation_notes: string | null;
  inquiry_notes: string | null;
  palpation_notes: string | null;
  final_diagnosis: string | null;
  bat_cuong: string | null;
  doctor_notes: string | null;
  practitioner_name: string;
  pulses: VisitDetailPulse[];
}

export interface VisitsListItem {
  id: string;
  visited_at: string;
  final_diagnosis: string | null;
  patient_id: string;
  full_name: string;
  patient_code: string;
  phone: string | null;
  sex: string | null;
  date_of_birth: string | null;
  prescription_id: string | null;
  prescription_code: string | null;
}

export interface VisitsFilterParams {
  q?: string;
  date?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface VisitsListResult {
  rows: VisitsListItem[];
  total: number;
  totalPages: number;
  safePage: number;
  offset: number;
  pageSize: number;
}

const PAGE_SIZES = [10, 25, 50];

/**
 * Lấy danh sách mẫu bắt mạch Đông y
 */
export async function getPulsePatterns(): Promise<PulsePattern[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<PulsePattern>(
    `SELECT id, name_viet, name_han_viet, description
     FROM pulse_patterns ORDER BY name_viet`,
  );
  return rows;
}

/**
 * Lấy lịch sử các lần khám của 1 bệnh nhân
 */
export async function getVisitsByPatient(patientId: string): Promise<VisitRow[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<VisitRow>(
    `SELECT v.id, v.patient_id, v.visited_at, v.final_diagnosis, u.full_name AS practitioner_name
     FROM visits v
     JOIN users u ON u.id = v.practitioner_id
     WHERE v.patient_id = $1
     ORDER BY v.visited_at DESC`,
    [patientId],
  );
  return rows;
}

/**
 * Chi tiết đầy đủ 1 lượt khám (Tứ chẩn + Mạch)
 */
export async function getVisitDetail(visitId: string): Promise<VisitDetail | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query(
    `SELECT v.id, v.visited_at, v.inspection_notes, v.auscultation_notes,
            v.inquiry_notes, v.palpation_notes, v.final_diagnosis, v.bat_cuong, v.doctor_notes,
            u.full_name AS practitioner_name
     FROM visits v
     JOIN users u ON u.id = v.practitioner_id
     WHERE v.id = $1`,
    [visitId],
  );
  if (rows.length === 0) return null;
  const pulses = await db.query<VisitDetailPulse>(
    `SELECT vp.hand, vp.position, pp.name_viet AS pattern_name, vp.custom_note
     FROM visit_pulses vp
     LEFT JOIN pulse_patterns pp ON pp.id = vp.pulse_pattern_id
     LEFT JOIN pulse_patterns pp2 ON pp2.id = vp.pulse_pattern_id_2
     WHERE vp.visit_id = $1
     ORDER BY vp.hand, vp.position`,
    [visitId],
  );
  return { ...rows[0], pulses: pulses.rows } as VisitDetail;
}

/**
 * Lấy danh sách lượt khám có phân trang, bộ lọc thời gian và trạng thái đơn thuốc
 */
export async function getVisitsList(
  params: VisitsFilterParams = {},
): Promise<VisitsListResult> {
  await requireRole("admin", "practitioner");

  const q = params.q?.trim() ?? "";
  const dateFilter = params.date ?? "all";
  const statusFilter = params.status ?? "all";
  const rawSize = params.pageSize ? Number(params.pageSize) : 10;
  const pageSize = PAGE_SIZES.includes(rawSize) ? rawSize : 10;
  const page = Math.max(1, Number(params.page) || 1);

  const conditions: string[] = [];
  const queryParams: unknown[] = [];

  if (q) {
    queryParams.push(`%${q}%`);
    const n = queryParams.length;
    conditions.push(
      `(p.full_name ILIKE $${n} OR p.phone ILIKE $${n} OR p.patient_code ILIKE $${n})`,
    );
  }
  if (dateFilter === "today") conditions.push(`v.visited_at::date = CURRENT_DATE`);
  else if (dateFilter === "yesterday") conditions.push(`v.visited_at::date = CURRENT_DATE - 1`);
  else if (dateFilter === "week") conditions.push(`v.visited_at >= date_trunc('week', CURRENT_DATE)`);

  const havingPrescription = statusFilter === "prescribed";
  const noPrescription = statusFilter === "pending";

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countSql = `
    SELECT COUNT(*)::int AS count FROM visits v
    JOIN patients p ON p.id = v.patient_id
    LEFT JOIN prescriptions pr ON pr.visit_id = v.id
    ${where}
    ${havingPrescription ? (where ? "AND" : "WHERE") + " pr.id IS NOT NULL" : ""}
    ${noPrescription ? (where ? "AND" : "WHERE") + " pr.id IS NULL" : ""}`;

  const { rows: countRows } = await db.query<{ count: number }>(countSql, queryParams);
  const total = countRows[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const dataSql = `
    SELECT v.id, v.visited_at, v.final_diagnosis, v.patient_id,
           p.full_name, p.patient_code, p.phone, p.sex, p.date_of_birth,
           pr.id AS prescription_id, pr.prescription_code
    FROM visits v
    JOIN patients p ON p.id = v.patient_id
    LEFT JOIN prescriptions pr ON pr.visit_id = v.id
    ${where}
    ${havingPrescription ? (where ? "AND" : "WHERE") + " pr.id IS NOT NULL" : ""}
    ${noPrescription ? (where ? "AND" : "WHERE") + " pr.id IS NULL" : ""}
    ORDER BY v.visited_at DESC
    LIMIT ${pageSize} OFFSET ${offset}`;

  const { rows } = await db.query<VisitsListItem>(dataSql, queryParams);

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
 * Đếm số lần khám của 1 bệnh nhân
 */
export async function getPatientVisitCount(patientId: string): Promise<number> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM visits WHERE patient_id = $1`,
    [patientId],
  );
  return Number(rows[0]?.cnt ?? 0);
}
