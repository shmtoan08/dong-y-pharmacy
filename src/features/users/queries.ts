import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export interface StaffRow {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
}

export interface StaffDetail {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
}

export interface StaffFilters {
  q?: string;
  role?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface StaffListResult {
  rows: StaffRow[];
  total: number;
  totalPages: number;
  safePage: number;
  pageSize: number;
  offset: number;
}

const PAGE_SIZES = [10, 25, 50];

/**
 * Lấy danh sách nhân viên phân trang, tìm kiếm và lọc theo vai trò, trạng thái
 */
export async function listStaff(filters: StaffFilters = {}): Promise<StaffListResult> {
  await requireRole("admin");

  const q = (filters.q ?? "").trim();
  const roleFilter = ["admin", "practitioner", "dispenser"].includes(filters.role ?? "")
    ? filters.role!
    : "all";
  const statusFilter = ["active", "locked"].includes(filters.status ?? "")
    ? filters.status!
    : "all";

  const rawSize = filters.pageSize ? Number(filters.pageSize) : 10;
  const pageSize = PAGE_SIZES.includes(rawSize) ? rawSize : 10;
  const page = Math.max(1, Number(filters.page) || 1);

  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (q) {
    where.push(`(u.full_name ILIKE $${i} OR u.email ILIKE $${i} OR u.phone ILIKE $${i})`);
    params.push(`%${q}%`);
    i++;
  }
  if (roleFilter !== "all") {
    where.push(`u.role = $${i}`);
    params.push(roleFilter);
    i++;
  }
  if (statusFilter === "active") {
    where.push(`u.is_active = true`);
  } else if (statusFilter === "locked") {
    where.push(`u.is_active = false`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRes = await db.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM users u ${whereSql}`,
    params,
  );
  const total = countRes.rows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const { rows } = await db.query<StaffRow>(
    `SELECT u.id, u.email, u.full_name, u.phone, u.role, u.is_active
     FROM users u
     ${whereSql}
     ORDER BY u.created_at ASC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, pageSize, offset],
  );

  return {
    rows,
    total,
    totalPages,
    safePage,
    pageSize,
    offset,
  };
}

/**
 * Lấy chi tiết thông tin nhân viên theo ID
 */
export async function getStaffById(id: string): Promise<StaffDetail | null> {
  await requireRole("admin");

  const { rows } = await db.query<StaffDetail>(
    "SELECT id, email, full_name, phone, role FROM users WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Lấy danh sách bác sĩ/thầy thuốc đang hoạt động
 */
export async function getActivePractitioners(): Promise<Array<{ id: string; name: string }>> {
  const { rows } = await db.query<{ id: string; name: string }>(
    `SELECT u.id, u.full_name AS name
     FROM users u
     WHERE u.role = 'practitioner' AND u.is_active = true
     ORDER BY name`,
  );
  return rows;
}

export interface PublicDoctor {
  id: string;
  name: string;
  specialty: string;
  avatarUrl: string | null;
  degree: string | null;
  experienceYears: number | null;
  acceptingBookings: boolean;
}

/**
 * Lấy danh sách bác sĩ công khai nhận lịch khám online
 */
export async function getPublicDoctors(): Promise<PublicDoctor[]> {
  const { rows } = await db.query<{
    id: string;
    name: string;
    specialty: string;
    avatar_url: string | null;
    degree: string | null;
    experience_years: number | null;
  }>(
    `SELECT id, full_name AS name,
            COALESCE(specialty, 'Đa khoa') AS specialty,
            avatar_url, degree, experience_years
     FROM users
     WHERE role = 'practitioner' AND is_active = true
     ORDER BY full_name`,
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    specialty: r.specialty,
    avatarUrl: r.avatar_url || null,
    degree: r.degree || null,
    experienceYears: r.experience_years || null,
    acceptingBookings: true,
  }));
}

export interface UserAuthRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  password_hash: string | null;
  is_active: boolean;
}

/**
 * Tìm tài khoản theo email phục vụ xác thực đăng nhập
 */
export async function getUserForAuth(email: string): Promise<UserAuthRow | null> {
  const { rows } = await db.query<UserAuthRow>(
    `SELECT id, email, full_name, role, password_hash, is_active
     FROM users WHERE email = $1`,
    [email],
  );
  return rows[0] ?? null;
}
