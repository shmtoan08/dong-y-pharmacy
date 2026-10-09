import { db } from "@/lib/db";

export interface WorkingHours {
  working: boolean;
  reason?: string;
  slots: string[]; // ["08:00", "08:30", ...]
}

const DEFAULT_SCHEDULE = {
  is_working: true,
  morning_start: "08:00",
  morning_end: "11:30",
  afternoon_start: "14:00",
  afternoon_end: "17:00",
};

function generateSlots(morningStart: string | null, morningEnd: string | null, afternoonStart: string | null, afternoonEnd: string | null, eveningStart?: string | null, eveningEnd?: string | null): string[] {
  const slots: string[] = [];
  const addRange = (start: string | null, end: string | null) => {
    if (!start || !end) return;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let cur = sh * 60 + sm;
    const endMin = eh * 60 + em;
    while (cur + 30 <= endMin) {
      slots.push(`${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`);
      cur += 30;
    }
  };
  addRange(morningStart, morningEnd);
  addRange(afternoonStart, afternoonEnd);
  addRange(eveningStart || null, eveningEnd || null);
  return slots;
}

// Kiem tra bac si co lam viec ngay date khong + sinh slots
export async function getWorkingHours(practitionerId: string, date: string): Promise<WorkingHours> {
  // 1. Kiem tra ngay nghi
  const { rows: offs } = await db.query(
    `SELECT reason FROM practitioner_day_offs WHERE practitioner_id = $1 AND off_date = $2`,
    [practitionerId, date]
  );
  if (offs.length > 0) {
    return { working: false, reason: offs[0].reason || "Bác sĩ nghỉ", slots: [] };
  }

  // 2. Kiem tra lich tuan
  const dow = new Date(date + "T00:00:00").getDay();
  const { rows: sched } = await db.query(
    `SELECT is_working, TO_CHAR(morning_start, 'HH24:MI') AS ms, TO_CHAR(morning_end, 'HH24:MI') AS me,
            TO_CHAR(afternoon_start, 'HH24:MI') AS as_, TO_CHAR(afternoon_end, 'HH24:MI') AS ae,
            TO_CHAR(evening_start, 'HH24:MI') AS es, TO_CHAR(evening_end, 'HH24:MI') AS ee
     FROM practitioner_weekly_schedules
     WHERE practitioner_id = $1 AND day_of_week = $2`,
    [practitionerId, dow]
  );

  let s: any = DEFAULT_SCHEDULE;
  let isWorking = dow !== 0; // CN nghi mac dinh
  if (sched.length > 0) {
    isWorking = sched[0].is_working;
    s = {
      is_working: sched[0].is_working,
      morning_start: sched[0].ms,
      morning_end: sched[0].me,
      afternoon_start: sched[0].as_,
      afternoon_end: sched[0].ae,
      evening_start: sched[0].es,
      evening_end: sched[0].ee,
    };
  }

  if (!isWorking) {
    return { working: false, reason: "Bác sĩ không làm việc ngày này", slots: [] };
  }

  const slots = generateSlots(s.morning_start, s.morning_end, s.afternoon_start, s.afternoon_end, s.evening_start, s.evening_end);
  return { working: true, slots };
}

// Dem so lich dat trong ngay cua bac si (de canh bao khi dang ky nghi)
export async function countBookingsOnDate(practitionerId: string, date: string): Promise<number> {
  const { rows } = await db.query(
    `SELECT COUNT(*) AS cnt FROM appointments
     WHERE practitioner_id = $1
       AND DATE(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = $2
       AND status IN ('scheduled', 'confirmed')`,
    [practitionerId, date]
  );
  return parseInt(rows[0]?.cnt || "0", 10);
}


// Dem so lich dat cua bac si trong 7 ngay toi (theo thu)
export async function getWeeklyBookingDensity(practitionerId: string): Promise<Record<number, number>> {
  const { rows } = await db.query(
    `SELECT EXTRACT(DOW FROM scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS dow, COUNT(*) AS cnt
     FROM appointments
     WHERE practitioner_id = $1
       AND scheduled_at >= NOW()
       AND scheduled_at < NOW() + INTERVAL '7 days'
       AND status IN ('scheduled', 'confirmed')
     GROUP BY dow`,
    [practitionerId]
  );
  const result: Record<number, number> = {};
  for (const r of rows) result[r.dow] = parseInt(r.cnt, 10);
  return result;
}
