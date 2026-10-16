import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export interface PatientRow {
  id: string;
  patient_code: string;
  full_name: string;
  date_of_birth: string | null;
  sex: string | null;
  phone: string | null;
  address: string | null;
  medical_history: string | null;
  allergies: string | null;
  created_at: string;
}

export interface PatientListItem {
  id: string;
  patient_code: string;
  full_name: string;
  phone: string | null;
  sex: string | null;
  date_of_birth: string | null;
  address: string | null;
  visit_count: number;
  last_visit: string | null;
}

export interface PatientsFilterParams {
  q?: string;
  sex?: string;
  visit?: string;
  page?: number;
  pageSize?: number;
}

export interface PatientsListResult {
  rows: PatientListItem[];
  total: number;
  totalPages: number;
  safePage: number;
  safeOffset: number;
  pageSize: number;
}

const PAGE_SIZES = [10, 25, 50];

/**
 * Lấy danh sách bệnh nhân có phân trang và bộ lọc tìm kiếm.
 */
export async function getPatientsList(
  params: PatientsFilterParams = {},
): Promise<PatientsListResult> {
  await requireRole("admin", "practitioner", "dispenser");

  const q = (params.q ?? "").trim();
  const sexFilter = ["male", "female", "other"].includes(params.sex ?? "")
    ? params.sex!
    : "all";
  const visitFilter = ["month", "stale", "never"].includes(params.visit ?? "")
    ? params.visit!
    : "all";

  const rawSize = params.pageSize ? Number(params.pageSize) : 10;
  const pageSize = PAGE_SIZES.includes(rawSize) ? rawSize : 10;
  const page = Math.max(1, Number(params.page) || 1);

  const where: string[] = [];
  const queryParams: unknown[] = [];
  let i = 1;

  if (q) {
    where.push(
      `(p.full_name ILIKE $${i} OR p.phone ILIKE $${i} OR p.patient_code ILIKE $${i} OR p.address ILIKE $${i})`,
    );
    queryParams.push(`%${q}%`);
    i++;
  }
  if (sexFilter !== "all") {
    where.push(`p.sex = $${i}`);
    queryParams.push(sexFilter);
    i++;
  }
  if (visitFilter === "month") {
    where.push(`vs.last_visit >= date_trunc('month', now())`);
  } else if (visitFilter === "stale") {
    where.push(
      `vs.last_visit IS NOT NULL AND vs.last_visit < now() - interval '6 months'`,
    );
  } else if (visitFilter === "never") {
    where.push(`vs.last_visit IS NULL`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countSql = `
    SELECT COUNT(*)::int AS total FROM patients p
    LEFT JOIN (SELECT patient_id, COUNT(*) AS cnt, MAX(visited_at) AS last_visit FROM visits GROUP BY patient_id) vs
      ON vs.patient_id = p.id
    ${whereSql}`;
  const countRes = await db.query<{ total: number }>(countSql, queryParams);
  const total = countRes.rows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const safeOffset = (safePage - 1) * pageSize;

  const dataSql = `
    SELECT p.id, p.patient_code, p.full_name, p.phone, p.sex, p.date_of_birth, p.address,
           COALESCE(vs.cnt, 0)::int AS visit_count, vs.last_visit
    FROM patients p
    LEFT JOIN (SELECT patient_id, COUNT(*) AS cnt, MAX(visited_at) AS last_visit FROM visits GROUP BY patient_id) vs
      ON vs.patient_id = p.id
    ${whereSql}
    ORDER BY p.created_at DESC
    LIMIT $${i} OFFSET $${i + 1}`;
  const dataRes = await db.query<PatientListItem>(dataSql, [
    ...queryParams,
    pageSize,
    safeOffset,
  ]);

  return {
    rows: dataRes.rows,
    total,
    totalPages,
    safePage,
    safeOffset,
    pageSize,
  };
}

/**
 * Lấy chi tiết thông tin 1 bệnh nhân theo ID.
 */
export async function getPatient(id: string): Promise<PatientRow | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<PatientRow>(
    `SELECT id, patient_code, full_name, date_of_birth, sex, phone,
            address, medical_history, allergies, created_at
     FROM patients WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Tìm kiếm bệnh nhân theo tên, sđt hoặc mã bệnh nhân (tối đa 50 kết quả).
 */
export async function searchPatients(q: string): Promise<PatientRow[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const like = `%${q.trim()}%`;
  const { rows } = await db.query<PatientRow>(
    `SELECT id, patient_code, full_name, date_of_birth, sex, phone,
            address, medical_history, allergies, created_at
     FROM patients
     WHERE full_name ILIKE $1 OR phone ILIKE $1 OR patient_code ILIKE $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [like],
  );
  return rows;
}

export interface PatientExportRow {
  patient_code: string;
  full_name: string;
  phone: string | null;
  sex: string | null;
  date_of_birth: string | null;
  address: string | null;
  visit_count: number;
  last_visit: string | null;
}

/**
 * Lấy danh sách bệnh nhân phục vụ xuất file CSV (tôn trọng bộ lọc tìm kiếm)
 */
export async function getPatientsExportData(filters: {
  q?: string;
  sex?: string;
  visit?: string;
}): Promise<PatientExportRow[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const q = (filters.q ?? "").trim();
  const sexFilter = ["male", "female", "other"].includes(filters.sex ?? "")
    ? filters.sex!
    : "all";
  const visitFilter = ["month", "stale", "never"].includes(filters.visit ?? "")
    ? filters.visit!
    : "all";

  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (q) {
    where.push(
      `(p.full_name ILIKE $${i} OR p.phone ILIKE $${i} OR p.patient_code ILIKE $${i} OR p.address ILIKE $${i})`,
    );
    params.push(`%${q}%`);
    i++;
  }
  if (sexFilter !== "all") {
    where.push(`p.sex = $${i}`);
    params.push(sexFilter);
    i++;
  }
  if (visitFilter === "month") {
    where.push(`vs.last_visit >= date_trunc('month', now())`);
  } else if (visitFilter === "stale") {
    where.push(`vs.last_visit IS NOT NULL AND vs.last_visit < now() - interval '6 months'`);
  } else if (visitFilter === "never") {
    where.push(`vs.last_visit IS NULL`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const res = await db.query<PatientExportRow>(
    `SELECT p.patient_code, p.full_name, p.phone, p.sex, p.date_of_birth, p.address,
            COALESCE(vs.cnt, 0)::int AS visit_count, vs.last_visit
     FROM patients p
     LEFT JOIN (SELECT patient_id, COUNT(*) AS cnt, MAX(visited_at) AS last_visit FROM visits GROUP BY patient_id) vs
       ON vs.patient_id = p.id
     ${whereSql}
     ORDER BY p.created_at DESC`,
    params,
  );
  return res.rows;
}

export interface PublicPatientLookup {
  code: string;
  name: string;
  phone: string | null;
  birth_year: number | null;
  gender: string | null;
}

/**
 * Tra cứu thông tin bệnh nhân theo mã bệnh nhân cho API đặt lịch công khai
 */
export async function lookupPatientByCode(code: string): Promise<PublicPatientLookup | null> {
  const { rows } = await db.query<PublicPatientLookup>(
    `SELECT patient_code AS code, full_name AS name, phone,
            EXTRACT(YEAR FROM date_of_birth)::int AS birth_year, sex AS gender
     FROM patients WHERE patient_code = $1 LIMIT 1`,
    [code.trim().toUpperCase()],
  );
  return rows[0] ?? null;
}
