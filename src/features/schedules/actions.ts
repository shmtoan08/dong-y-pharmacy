"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { countBookingsOnDate, getWeeklyBookingDensity } from "./service";

export interface WeeklyScheduleRow {
  day_of_week: number;
  is_working: boolean;
  morning_start: string | null;
  morning_end: string | null;
  afternoon_start: string | null;
  afternoon_end: string | null;
  evening_start?: string | null;
  evening_end?: string | null;
}

export interface DayOffRow {
  id: string;
  off_date: string;
  reason: string | null;
  created_at: string;
}

// Lich tuan cua chinh minh (bac si)
export async function getMyWeeklySchedule(): Promise<WeeklyScheduleRow[]> {
  const user = await requireUser();
  const { rows } = await db.query(
    `SELECT day_of_week, is_working,
            TO_CHAR(morning_start, 'HH24:MI') AS morning_start,
            TO_CHAR(morning_end, 'HH24:MI') AS morning_end,
            TO_CHAR(afternoon_start, 'HH24:MI') AS afternoon_start,
            TO_CHAR(afternoon_end, 'HH24:MI') AS afternoon_end,
            TO_CHAR(evening_start, 'HH24:MI') AS evening_start,
            TO_CHAR(evening_end, 'HH24:MI') AS evening_end
     FROM practitioner_weekly_schedules
     WHERE practitioner_id = $1 ORDER BY day_of_week`,
    [user.id]
  );
  return rows as WeeklyScheduleRow[];
}

// Cap nhat lich tuan
export async function updateMyWeeklySchedule(rows: WeeklyScheduleRow[]): Promise<{ error?: string }> {
  const user = await requireUser();
  if (user.role !== "practitioner" && user.role !== "admin") {
    return { error: "Không có quyền" };
  }
  const targetId = user.id;

  for (const r of rows) {
    await db.query(
      `INSERT INTO practitioner_weekly_schedules
         (practitioner_id, day_of_week, is_working, morning_start, morning_end, afternoon_start, afternoon_end, evening_start, evening_end, updated_at)
       VALUES ($1, $2, $3, $4::time, $5::time, $6::time, $7::time, $8::time, $9::time, NOW())
       ON CONFLICT (practitioner_id, day_of_week) DO UPDATE SET
         is_working = EXCLUDED.is_working,
         morning_start = EXCLUDED.morning_start,
         morning_end = EXCLUDED.morning_end,
         afternoon_start = EXCLUDED.afternoon_start,
         afternoon_end = EXCLUDED.afternoon_end,
         evening_start = EXCLUDED.evening_start,
         evening_end = EXCLUDED.evening_end,
         updated_at = NOW()`,
      [targetId, r.day_of_week, r.is_working, r.morning_start, r.morning_end, r.afternoon_start, r.afternoon_end, r.evening_start || null, r.evening_end || null]
    );
  }
  revalidatePath("/schedules");
  return {};
}

// Ngay nghi cua minh
export async function getMyDayOffs(): Promise<DayOffRow[]> {
  const user = await requireUser();
  const { rows } = await db.query(
    `SELECT id, TO_CHAR(off_date, 'YYYY-MM-DD') AS off_date, reason,
            TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS created_at
     FROM practitioner_day_offs
     WHERE practitioner_id = $1 AND off_date >= CURRENT_DATE
     ORDER BY off_date`,
    [user.id]
  );
  return rows as DayOffRow[];
}

// Dang ky nghi — chan neu ngay do con lich dat
export async function requestDayOff(date: string, reason: string): Promise<{ error?: string; blockedCount?: number }> {
  const user = await requireUser();
  if (user.role !== "practitioner" && user.role !== "admin") {
    return { error: "Không có quyền" };
  }
  if (date < new Date().toISOString().slice(0, 10)) {
    return { error: "Không thể đăng ký nghỉ cho ngày đã qua" };
  }

  // Kiem tra con lich dat khong
  const count = await countBookingsOnDate(user.id, date);
  if (count > 0) {
    return { error: `Ngày ${date} còn ${count} lịch đặt. Vui lòng dời hết lịch trước khi đăng ký nghỉ.`, blockedCount: count };
  }

  await db.query(
    `INSERT INTO practitioner_day_offs (practitioner_id, off_date, reason, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (practitioner_id, off_date) DO UPDATE SET reason = EXCLUDED.reason`,
    [user.id, date, reason?.trim() || null, user.id]
  );
  revalidatePath("/schedules");
  return {};
}

// Huy dang ky nghi
export async function cancelDayOff(id: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const { rowCount } = await db.query(
    `DELETE FROM practitioner_day_offs WHERE id = $1 AND practitioner_id = $2 AND off_date >= CURRENT_DATE`,
    [id, user.id]
  );
  if (rowCount === 0) return { error: "Không tìm thấy đơn nghỉ" };
  revalidatePath("/schedules");
  return {};
}

// Admin: xem lich cua bac si cu the
export async function getPractitionerSchedule(practitionerId: string): Promise<WeeklyScheduleRow[]> {
  const user = await requireUser();
  if (!["admin", "receptionist"].includes(user.role)) throw new Error("Không có quyền");
  const { rows } = await db.query(
    `SELECT day_of_week, is_working,
            TO_CHAR(morning_start, 'HH24:MI') AS morning_start,
            TO_CHAR(morning_end, 'HH24:MI') AS morning_end,
            TO_CHAR(afternoon_start, 'HH24:MI') AS afternoon_start,
            TO_CHAR(afternoon_end, 'HH24:MI') AS afternoon_end,
            TO_CHAR(evening_start, 'HH24:MI') AS evening_start,
            TO_CHAR(evening_end, 'HH24:MI') AS evening_end
     FROM practitioner_weekly_schedules
     WHERE practitioner_id = $1 ORDER BY day_of_week`,
    [practitionerId]
  );
  return rows as WeeklyScheduleRow[];
}

// Mat do lich dat 7 ngay toi (hien tren lich tuan)
export async function getMyWeeklyDensity(): Promise<Record<number, number>> {
  const user = await requireUser();
  return getWeeklyBookingDensity(user.id);
}
