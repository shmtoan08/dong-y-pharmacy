"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export interface DayDensity {
  date: string; // YYYY-MM-DD
  count: number;
  isSunday: boolean;
}

// Mật độ lịch hẹn theo ngày (cho WeekRibbon)
export async function getAppointmentDensity(
  startDate: string,
  days: number,
  onlineOnly = false
): Promise<DayDensity[]> {
  const user = await requireUser();
  // Quyền xem lịch
  const allowedRoles = ["admin", "receptionist", "practitioner", "dispenser"];
  if (!allowedRoles.includes(user.role)) throw new Error("Không có quyền");

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);

  let where = `a.scheduled_at >= $1::date AND a.scheduled_at < $2::date
               AND a.status NOT IN ('cancelled', 'rejected')`;
  const params: any[] = [startDate, endDate.toISOString().slice(0, 10)];

  if (onlineOnly) {
    where += ` AND a.source = 'online'`;
  }
  if (user.role === "practitioner") {
    params.push(user.id);
    where += ` AND a.practitioner_id = $${params.length}`;
  }

  const { rows } = await db.query(
    `SELECT TO_CHAR(a.scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS d,
            COUNT(*) AS cnt
     FROM appointments a
     WHERE ${where}
     GROUP BY d`,
    params
  );

  const map = new Map<string, number>();
  for (const r of rows) map.set(r.d, parseInt(r.cnt, 10));

  const result: DayDensity[] = [];
  const cur = new Date(startDate + "T00:00:00");
  for (let i = 0; i < days; i++) {
    const ds = cur.toISOString().slice(0, 10);
    result.push({
      date: ds,
      count: map.get(ds) || 0,
      isSunday: cur.getDay() === 0,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}
