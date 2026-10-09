"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export interface DoctorScheduleMatrix {
  doctorId: string;
  doctorName: string;
  days: Record<number, {
    working: boolean;
    hours: string; // "08:00-11:30, 14:00-17:00" hoac "Nghỉ"
  }>;
  dayOffs: string[]; // ["2026-10-20", ...] trong 30 ngay toi
}

// Lich truc toan phong kham: matrix BS x ngay trong tuan
export async function getMasterSchedule(): Promise<DoctorScheduleMatrix[]> {
  const user = await requireUser();
  if (!["admin", "receptionist"].includes(user.role)) {
    throw new Error("Không có quyền");
  }

  const { rows: doctors } = await db.query(
    `SELECT id, full_name FROM users WHERE role = 'practitioner' AND is_active = true ORDER BY full_name`
  );

  const result: DoctorScheduleMatrix[] = [];
  for (const doc of doctors) {
    const { rows: sched } = await db.query(
      `SELECT day_of_week, is_working,
              TO_CHAR(morning_start, 'HH24:MI') AS ms, TO_CHAR(morning_end, 'HH24:MI') AS me,
              TO_CHAR(afternoon_start, 'HH24:MI') AS as_, TO_CHAR(afternoon_end, 'HH24:MI') AS ae,
              TO_CHAR(evening_start, 'HH24:MI') AS es, TO_CHAR(evening_end, 'HH24:MI') AS ee
       FROM practitioner_weekly_schedules WHERE practitioner_id = $1`,
      [doc.id]
    );

    const days: Record<number, { working: boolean; hours: string }> = {};
    for (let dow = 0; dow <= 6; dow++) {
      const s = sched.find((r) => r.day_of_week === dow);
      if (!s || !s.is_working) {
        days[dow] = { working: false, hours: "Nghỉ" };
      } else {
        const parts: string[] = [];
        if (s.ms && s.me) parts.push(`${s.ms}-${s.me}`);
        if (s.as_ && s.ae) parts.push(`${s.as_}-${s.ae}`);
        if (s.es && s.ee) parts.push(`${s.es}-${s.ee}`);
        days[dow] = { working: true, hours: parts.join(", ") || "Cả ngày" };
      }
    }

    const { rows: offs } = await db.query(
      `SELECT TO_CHAR(off_date, 'YYYY-MM-DD') AS d, reason
       FROM practitioner_day_offs
       WHERE practitioner_id = $1 AND off_date >= CURRENT_DATE AND off_date < CURRENT_DATE + INTERVAL '30 days'
       ORDER BY off_date`,
      [doc.id]
    );

    result.push({
      doctorId: doc.id,
      doctorName: doc.full_name,
      days,
      dayOffs: offs.map((r) => `${r.d}${r.reason ? ` (${r.reason})` : ""}`),
    });
  }

  return result;
}
