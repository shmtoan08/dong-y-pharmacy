"use server";

import { db, withTransaction } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
  booking_type: "advance" | "queue"; // dat truoc | boc so
}

function canManage(userRole: string): boolean {
  return ["admin", "receptionist", "practitioner"].includes(userRole);
}

// Danh sách lịch online theo tab
export async function getOnlineBookings(
  tab: "pending" | "confirmed" | "today" | "all",
  dateFilter?: string,
  search?: string
): Promise<OnlineBooking[]> {
  const user = await requireUser();
  if (!canManage(user.role)) throw new Error("Không có quyền");

  const todayStr = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
    .toISOString().slice(0, 10);

  let where = `a.source = 'online'`;
  const params: any[] = [];

  if (tab === "pending") {
    // Chi lich dat truoc cho xac nhan (khong tinh boc so vi tu dong confirmed)
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
    const p = params.length;
    where += ` AND (p.full_name ILIKE $${p} OR REPLACE(REPLACE(p.phone, ' ', ''), '.', '') ILIKE $${p} OR a.appointment_code ILIKE $${p})`;
  }

  // Bac si chi xem lich cua minh
  if (user.role === "practitioner") {
    params.push(user.id);
    where += ` AND a.practitioner_id = $${params.length}`;
  }

  const { rows } = await db.query<OnlineBooking>(
    `SELECT a.id, a.appointment_code, p.full_name AS patient_name, p.patient_code,
            p.phone, a.scheduled_at, a.queue_number, a.queue_date, a.status,
            u.full_name AS doctor_name, a.note AS symptom, a.reject_reason, a.contacted_at,
            EXTRACT(YEAR FROM p.date_of_birth)::int AS birth_year, p.sex AS gender,
            CASE WHEN a.queue_number IS NOT NULL THEN 'queue' ELSE 'advance' END AS booking_type
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN users u ON u.id = a.practitioner_id
     WHERE ${where}
     ORDER BY a.scheduled_at DESC
     LIMIT 100`,
    params
  );
  return rows;
}

// Dem so lich cho xac nhan (badge)
export async function countPendingBookings(): Promise<number> {
  const user = await requireUser();
  if (!canManage(user.role)) return 0;

  let where = `a.source = 'online' AND a.status = 'scheduled' AND a.queue_number IS NULL`;
  const params: any[] = [];
  if (user.role === "practitioner") {
    params.push(user.id);
    where += ` AND a.practitioner_id = $1`;
  }

  const { rows } = await db.query<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM appointments a WHERE ${where}`,
    params
  );
  return parseInt(rows[0].cnt, 10);
}

// Xac nhan lich (chong xu ly dong thoi bang dieu kien status)
export async function confirmBooking(id: string) {
  const user = await requireUser();
  if (!canManage(user.role)) throw new Error("Không có quyền");

  const { rowCount } = await db.query(
    `UPDATE appointments SET status = 'confirmed', confirmed_at = NOW(), confirmed_by = $2
     WHERE id = $1 AND status = 'scheduled'`,
    [id, user.id]
  );
  if (rowCount === 0) throw new Error("Lịch đã được xử lý bởi người khác");
  revalidatePath("/appointments/online");
}

// Tu choi lich
export async function rejectBooking(id: string, reason: string) {
  const user = await requireUser();
  if (!["admin", "receptionist"].includes(user.role)) throw new Error("Không có quyền");

  const { rowCount } = await db.query(
    `UPDATE appointments SET status = 'rejected', reject_reason = $3, confirmed_at = NOW(), confirmed_by = $2
     WHERE id = $1 AND status = 'scheduled'`,
    [id, user.id, reason.trim()]
  );
  if (rowCount === 0) throw new Error("Lịch đã được xử lý bởi người khác");
  revalidatePath("/appointments/online");
}

// Huy lich da xac nhan
export async function cancelBooking(id: string, reason: string) {
  const user = await requireUser();
  if (!["admin", "receptionist"].includes(user.role)) throw new Error("Không có quyền");

  await db.query(
    `UPDATE appointments SET status = 'cancelled', reject_reason = $2
     WHERE id = $1 AND status IN ('scheduled', 'confirmed')`,
    [id, reason.trim() || "Hủy bởi nhân viên"]
  );
  revalidatePath("/appointments/online");
}

// Danh dau da lien he
export async function markContacted(id: string, note: string) {
  const user = await requireUser();
  if (!canManage(user.role)) throw new Error("Không có quyền");

  await db.query(
    `UPDATE appointments SET contacted_at = NOW(), contacted_by = $2, contact_note = $3
     WHERE id = $1`,
    [id, user.id, note.trim() || null]
  );
  revalidatePath("/appointments/online");
}


// Tiep don 1-click: chuyen lich sang checked_in + tao visit
export async function checkInOnlineBooking(id: string): Promise<{ visitId?: string; error?: string }> {
  const user = await requireUser();
  if (!["admin", "receptionist", "practitioner"].includes(user.role)) {
    return { error: "Không có quyền" };
  }

  try {
    let visitId = "";
    await withTransaction(async (tx) => {
      // Lock + check-in
      const { rows } = await tx.query<{ patient_id: string; practitioner_id: string | null; status: string }>(
        `SELECT patient_id, practitioner_id, status FROM appointments WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (rows.length === 0) throw new Error("NOT_FOUND");
      if (!["scheduled", "confirmed"].includes(rows[0].status)) throw new Error("INVALID_STATUS");

      await tx.query(
        `UPDATE appointments SET status = 'checked_in', updated_at = NOW() WHERE id = $1`,
        [id]
      );

      // Tao visit (chong double-click)
      const { rows: ex } = await tx.query(`SELECT id FROM visits WHERE appointment_id = $1`, [id]);
      if (ex.length > 0) {
        visitId = ex[0].id;
        return;
      }

      const { rows: v } = await tx.query<{ id: string }>(
        `INSERT INTO visits (patient_id, practitioner_id, visited_at, appointment_id)
         VALUES ($1, $2, NOW(), $3) RETURNING id`,
        [rows[0].patient_id, rows[0].practitioner_id ?? user.id, id]
      );
      visitId = v[0].id;
    });

    revalidatePath("/appointments/online");
    return { visitId };
  } catch (e: any) {
    if (e.message === "NOT_FOUND") return { error: "Không tìm thấy lịch hẹn" };
    if (e.message === "INVALID_STATUS") return { error: "Lịch không ở trạng thái chờ tiếp đón" };
    return { error: "Lỗi hệ thống" };
  }
}

// Doi lich (doi ngay/gio)
export async function rescheduleBooking(id: string, newDate: string, newTime: string) {
  const user = await requireUser();
  if (!["admin", "receptionist"].includes(user.role)) throw new Error("Không có quyền");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || !/^\d{2}:\d{2}$/.test(newTime)) {
    throw new Error("Ngày/giờ không hợp lệ");
  }

  const { rowCount } = await db.query(
    `UPDATE appointments SET scheduled_at = ($2 || ' ' || $3 || ':00+07')::timestamptz
     WHERE id = $1 AND status IN ('scheduled', 'confirmed') AND queue_number IS NULL`,
    [id, newDate, newTime]
  );
  if (rowCount === 0) throw new Error("Không thể đổi lịch này");
  revalidatePath("/appointments/online");
}
