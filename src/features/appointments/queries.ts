import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

export interface AppointmentRow {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string | null;
  practitioner_id: string | null;
  practitioner_name: string | null;
  scheduled_at: string;
  status: AppointmentStatus;
  reason: string | null;
  note: string | null;
  visit_id: string | null;
}

export interface QueueItem {
  id: string;
  queue_number: number;
  patient_name: string;
  phone: string;
  status: string;
  appointment_code: string;
  scheduled_at: string;
}

export interface OnlineBooking {
  id: string;
  appointment_code: string;
  patient_name: string;
  patient_code: string;
  phone: string;
  scheduled_at: string;
  queue_number: number | null;
  queue_date: string | null;
  status: string;
  doctor_name: string | null;
  symptom: string | null;
  reject_reason: string | null;
  birth_year: number | null;
  gender: string | null;
  contacted_at: string | null;
  booking_type: "advance" | "queue";
}

/**
 * Lấy danh sách lịch hẹn theo ngày kèm bộ lọc
 */
export async function listAppointments(
  date: string,
  filter?: { q?: string; practitionerId?: string; status?: string },
): Promise<AppointmentRow[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const conds = [`a.scheduled_at >= $1::date`, `a.scheduled_at < ($1::date + interval '1 day')`];
  const params: unknown[] = [date];
  if (filter?.q) {
    params.push(`%${filter.q}%`);
    conds.push(`(pt.full_name ILIKE $${params.length} OR pt.phone ILIKE $${params.length})`);
  }
  if (filter?.practitionerId) {
    params.push(filter.practitionerId);
    conds.push(`a.practitioner_id = $${params.length}`);
  }
  if (filter?.status) {
    params.push(filter.status);
    conds.push(`a.status = $${params.length}`);
  }
  const { rows } = await db.query(
    `SELECT a.id, a.patient_id, pt.full_name AS patient_name, pt.phone AS patient_phone,
            a.practitioner_id, u.full_name AS practitioner_name,
            a.scheduled_at, a.status, a.reason, a.note,
            v.id AS visit_id
     FROM appointments a
     JOIN patients pt ON pt.id = a.patient_id
     LEFT JOIN users u ON u.id = a.practitioner_id
     LEFT JOIN visits v ON v.appointment_id = a.id
     WHERE ${conds.join(" AND ")}
     ORDER BY a.scheduled_at`,
    params,
  );
  return rows as AppointmentRow[];
}

/**
 * Thống kê số lượng lịch hẹn theo trạng thái trong ngày
 */
export async function getTodayStats(date: string): Promise<Record<AppointmentStatus, number>> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query(
    `SELECT status, COUNT(*) AS c FROM appointments
     WHERE scheduled_at >= $1::date AND scheduled_at < ($1::date + interval '1 day')
     GROUP BY status`,
    [date],
  );
  const stats: Record<AppointmentStatus, number> = {
    scheduled: 0,
    confirmed: 0,
    checked_in: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
  };
  for (const r of rows) stats[r.status as AppointmentStatus] = Number(r.c);
  return stats;
}

/**
 * Chi tiết 1 lịch hẹn
 */
export async function getAppointment(id: string): Promise<AppointmentRow | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query(
    `SELECT a.id, a.patient_id, pt.full_name AS patient_name, pt.phone AS patient_phone,
            a.practitioner_id, u.full_name AS practitioner_name,
            a.scheduled_at, a.status, a.reason, a.note,
            v.id AS visit_id
     FROM appointments a
     JOIN patients pt ON pt.id = a.patient_id
     LEFT JOIN users u ON u.id = a.practitioner_id
     LEFT JOIN visits v ON v.appointment_id = a.id
     WHERE a.id = $1`,
    [id],
  );
  return (rows[0] as AppointmentRow) ?? null;
}

/**
 * Danh sách bác sĩ cho bộ lọc lịch hẹn
 */
export async function getAppointmentPractitioners(): Promise<Array<{ id: string; full_name: string }>> {
  const { rows } = await db.query<{ id: string; full_name: string }>(
    `SELECT u.id, u.full_name
     FROM users u
     WHERE u.role = 'practitioner' AND u.is_active = true
     ORDER BY u.full_name`,
  );
  return rows;
}

/**
 * Lấy hàng đợi bốc số hôm nay
 */
export async function getTodayQueue(): Promise<QueueItem[]> {
  const user = await requireUser();
  if (!["admin", "practitioner", "dispenser"].includes(user.role)) {
    throw new Error("Không có quyền");
  }
  const todayStr = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
    .toISOString()
    .slice(0, 10);

  const { rows } = await db.query<QueueItem>(
    `SELECT a.id, a.queue_number, p.full_name AS patient_name, p.phone,
            a.status, a.appointment_code, a.scheduled_at
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     WHERE a.queue_date = $1 AND a.queue_number IS NOT NULL
       AND a.status IN ('scheduled', 'confirmed', 'checked_in')
     ORDER BY a.queue_number`,
    [todayStr],
  );
  return rows;
}

/**
 * Danh sách đặt lịch online
 */
export async function getOnlineBookings(
  tab: "pending" | "confirmed" | "today" | "all",
  dateFilter?: string,
  search?: string,
): Promise<OnlineBooking[]> {
  const user = await requireUser();
  if (!["admin", "receptionist", "practitioner"].includes(user.role)) {
    throw new Error("Không có quyền");
  }

  const todayStr = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
    .toISOString()
    .slice(0, 10);

  let where = `a.source = 'online'`;
  const params: unknown[] = [];

  if (tab === "pending") {
    where += ` AND a.status = 'scheduled' AND a.queue_number IS NULL`;
  } else if (tab === "confirmed") {
    where += ` AND a.status = 'confirmed'`;
  } else if (tab === "today" && !dateFilter) {
    where += ` AND (DATE(a.scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = $1 OR a.queue_date = $1)
               AND a.status NOT IN ('cancelled', 'rejected', 'completed')`;
    params.push(todayStr);
  } else {
    where += ` AND a.status NOT IN ('cancelled', 'rejected')`;
  }

  if (dateFilter) {
    params.push(dateFilter);
    where += ` AND (DATE(a.scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = $${params.length} OR a.queue_date = $${params.length})`;
  }

  if (search?.trim()) {
    params.push(`%${search.trim()}%`);
    where += ` AND (p.full_name ILIKE $${params.length} OR p.phone ILIKE $${params.length} OR a.appointment_code ILIKE $${params.length})`;
  }

  const { rows } = await db.query<OnlineBooking>(
    `SELECT a.id, a.appointment_code, p.full_name AS patient_name,
            p.patient_code, p.phone, a.scheduled_at, a.queue_number, a.queue_date,
            a.status, u.full_name AS doctor_name, a.reason AS symptom,
            a.reject_reason, EXTRACT(YEAR FROM p.date_of_birth)::int AS birth_year, p.sex AS gender, a.contacted_at,
            CASE WHEN a.queue_number IS NOT NULL THEN 'queue' ELSE 'advance' END AS booking_type
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN users u ON u.id = a.practitioner_id
     WHERE ${where}
     ORDER BY a.scheduled_at DESC`,
    params,
  );

  return rows;
}

/**
 * Đếm số lượng đặt khám online đang chờ duyệt (cho badge sidebar hoặc api nội bộ)
 */
export async function countPendingBookings(role: string, userId?: string): Promise<number> {
  let where = `a.source = 'online' AND a.status = 'scheduled' AND a.queue_number IS NULL`;
  const params: unknown[] = [];
  if (role === "practitioner" && userId) {
    params.push(userId);
    where += ` AND a.practitioner_id = $1`;
  }

  const { rows } = await db.query<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM appointments a WHERE ${where}`,
    params,
  );
  return parseInt(rows[0]?.cnt || "0", 10);
}

export interface PublicClinicStatus {
  currentNumber: number | null;
  waitingCount: number;
  totalIssued: number;
  nextNumber: number | null;
}

/**
 * Lấy trạng thái bốc số phòng khám hôm nay cho API công khai
 */
export async function getPublicClinicStatus(todayStr: string): Promise<PublicClinicStatus> {
  const [currentRes, waitingRes, totalRes, nextRes] = await Promise.all([
    db.query<{ queue_number: number }>(
      `SELECT queue_number FROM appointments
       WHERE queue_date = $1 AND status = 'checked_in' AND queue_number IS NOT NULL
       ORDER BY queue_number LIMIT 1`,
      [todayStr],
    ),
    db.query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM appointments
       WHERE queue_date = $1 AND status IN ('scheduled', 'confirmed') AND queue_number IS NOT NULL`,
      [todayStr],
    ),
    db.query<{ max_num: number | null }>(
      `SELECT COALESCE(MAX(queue_number), 0) AS max_num FROM appointments WHERE queue_date = $1`,
      [todayStr],
    ),
    db.query<{ next_num: number | null }>(
      `SELECT MIN(queue_number) AS next_num FROM appointments
       WHERE queue_date = $1 AND status IN ('scheduled', 'confirmed') AND queue_number IS NOT NULL`,
      [todayStr],
    ),
  ]);

  return {
    currentNumber: currentRes.rows[0]?.queue_number ?? null,
    waitingCount: parseInt(waitingRes.rows[0]?.cnt || "0", 10),
    totalIssued: parseInt(String(totalRes.rows[0]?.max_num || 0), 10),
    nextNumber: nextRes.rows[0]?.next_num ? parseInt(String(nextRes.rows[0].next_num), 10) : null,
  };
}

export interface PublicAppointmentLookup {
  code: string;
  scheduledAt: string;
  status: string;
  rejectReason: string | null;
  doctorName: string;
}

/**
 * Tra cứu lịch hẹn công khai theo số điện thoại
 */
export async function lookupAppointmentsByPhone(phoneClean: string): Promise<PublicAppointmentLookup[]> {
  const { rows } = await db.query<{
    appointment_code: string;
    scheduled_at: string;
    status: string;
    reject_reason: string | null;
    doctor_name: string;
  }>(
    `SELECT a.appointment_code, a.scheduled_at, a.status, a.reject_reason,
            COALESCE(u.full_name, 'Bác sĩ bất kỳ') AS doctor_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN users u ON u.id = a.practitioner_id
     WHERE REPLACE(REPLACE(p.phone, ' ', ''), '.', '') = $1
       AND a.scheduled_at >= NOW() - INTERVAL '1 day'
       AND a.status IN ('scheduled', 'confirmed', 'checked_in', 'rejected')
     ORDER BY a.scheduled_at
     LIMIT 10`,
    [phoneClean],
  );

  return rows.map((r) => ({
    code: r.appointment_code,
    scheduledAt: r.scheduled_at,
    status: r.status,
    rejectReason: r.reject_reason,
    doctorName: r.doctor_name,
  }));
}

/**
 * Lấy số lượng slot đã đặt trong ngày cho danh sách bác sĩ
 */
export async function getPublicSlotBookings(
  date: string,
  workingDoctors: string[],
): Promise<Array<{ slot: string; practitioner_id: string; cnt: string }>> {
  const { rows } = await db.query<{
    slot: string;
    practitioner_id: string;
    cnt: string;
  }>(
    `SELECT TO_CHAR(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI') AS slot,
            practitioner_id, COUNT(*)::text AS cnt
     FROM appointments
     WHERE DATE(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = $1
       AND status IN ('scheduled', 'confirmed', 'checked_in')
       AND practitioner_id = ANY($2::uuid[])
     GROUP BY slot, practitioner_id`,
    [date, workingDoctors],
  );
  return rows;
}

/**
 * Lấy quota giới hạn số lượng bốc số trong ngày
 */
export async function getQueueQuota(): Promise<number> {
  try {
    const { rows } = await db.query<{ value: string }>(
      `SELECT value FROM system_settings WHERE key = 'max_queue_per_day' LIMIT 1`,
    );
    const v = parseInt(rows[0]?.value || "50", 10);
    return isNaN(v) || v < 1 ? 50 : v;
  } catch {
    return 50;
  }
}
