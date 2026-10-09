import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";

export const dynamic = "force-dynamic";

// Lấy thời gian hiện tại theo giờ Việt Nam
function getVietnamTime(): { hour: number; minute: number; day: number; dateStr: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    hour: parseInt(parts.hour, 10),
    minute: parseInt(parts.minute, 10),
    day: weekdays[parts.weekday] ?? 1,
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
  };
}


function checkApiKey(req: Request): boolean {
  const key = req.headers.get("authorization")?.replace("Bearer ", "");
  const expected = process.env.BOOKING_API_KEY;
  if (!expected || !key) return false;
  return key === expected;
}

const QUOTA = 40;

// POST /api/public/queue — bốc số khám trong ngày
export async function POST(req: Request) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { patientName, phone, birthYear, gender, symptom, idempotencyKey } = body;

  if (!patientName?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "Thiếu họ tên hoặc SĐT" }, { status: 400 });
  }
  const phoneClean = phone.replace(/\D/g, "");
  if (!/^0\d{9}$/.test(phoneClean)) {
    return NextResponse.json({ error: "SĐT không hợp lệ" }, { status: 400 });
  }
  const by = parseInt(birthYear, 10);
  const cy = new Date().getFullYear();
  if (!/^\d{4}$/.test(String(birthYear || "").trim()) || by < 1930 || by > cy) {
    return NextResponse.json({ error: "Năm sinh không hợp lệ" }, { status: 400 });
  }
  if (!["male", "female"].includes(gender)) {
    return NextResponse.json({ error: "Giới tính không hợp lệ" }, { status: 400 });
  }

  // Kiểm tra giờ làm việc (server-side)
  const vn = getVietnamTime();
  const hour = vn.hour + vn.minute / 60;
  const day = vn.day;
  const todayStr = vn.dateStr;

  if (day === 0) {
    return NextResponse.json({ error: "Phòng khám nghỉ Chủ nhật" }, { status: 400 });
  }
  if (hour < 8 || hour >= 17 || (hour >= 11.5 && hour < 14)) {
    return NextResponse.json({ error: "Ngoài giờ nhận bệnh (8:00-11:30, 14:00-17:00)" }, { status: 400 });
  }

  try {
    const result = await withTransaction(async (tx) => {
      // Idempotency
      if (idempotencyKey) {
        const { rows: ex } = await tx.query(
          `SELECT queue_number FROM appointments WHERE idempotency_key = $1`,
          [idempotencyKey]
        );
        if (ex.length > 0) return { queueNumber: ex[0].queue_number, duplicate: true };
      }

      // Kiểm tra bệnh nhân đã có lượt active hôm nay chưa (theo tên + SĐT)
      const { rows: active } = await tx.query(
        `SELECT a.id FROM appointments a
         JOIN patients p ON p.id = a.patient_id
         WHERE a.queue_date = $1 AND a.status IN ('scheduled', 'checked_in')
           AND a.queue_number IS NOT NULL
           AND REPLACE(REPLACE(p.phone, ' ', ''), '.', '') = $2
           AND p.full_name ILIKE $3
         LIMIT 1`,
        [todayStr, phoneClean, patientName.trim()]
      );
      if (active.length > 0) {
        throw new Error("Bệnh nhân đã có số thứ tự hôm nay");
      }

      // Khóa bộ đếm ngày và cấp số (chống race condition)
      await tx.query(
        `INSERT INTO daily_queues (queue_date, last_number) VALUES ($1, 0)
         ON CONFLICT (queue_date) DO NOTHING`,
        [todayStr]
      );
      const { rows: counter } = await tx.query(
        `SELECT last_number FROM daily_queues WHERE queue_date = $1 FOR UPDATE`,
        [todayStr]
      );
      const nextNum = counter[0].last_number + 1;

      if (nextNum > QUOTA) {
        throw new Error("Hôm nay đã hết số, vui lòng quay lại ngày mai");
      }

      await tx.query(
        `UPDATE daily_queues SET last_number = $1 WHERE queue_date = $2`,
        [nextNum, todayStr]
      );

      // Tìm hoặc tạo bệnh nhân
      let patientId: string;
      const { rows: found } = await tx.query(
        `SELECT id FROM patients WHERE REPLACE(REPLACE(phone, ' ', ''), '.', '') = $1 AND full_name ILIKE $2 LIMIT 1`,
        [phoneClean, patientName.trim()]
      );
      if (found.length > 0) {
        patientId = found[0].id;
      } else {
        const dStr = new Date().toISOString().slice(0, 10);
        const { rows: seq } = await tx.query(`SELECT next_daily_n($1, 'patient') AS n`, [dStr]);
        const ptCode = `BN-${dStr.replace(/-/g, "")}-${String(seq[0].n).padStart(3, "0")}`;
        const { rows: np } = await tx.query(
          `INSERT INTO patients (patient_code, full_name, phone, date_of_birth, sex)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [ptCode, patientName.trim(), phoneClean, `${by}-01-01`, gender]
        );
        patientId = np[0].id;
      }

      // Tạo lịch hẹn với số thứ tự
      const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
      const apptCode = `LH-${todayStr.replace(/-/g, "")}-${rand}`;
      await tx.query(
        `INSERT INTO appointments
           (patient_id, scheduled_at, status, source, note, idempotency_key, appointment_code, queue_number, queue_date)
         VALUES ($1, NOW(), 'scheduled', 'online', $2, $3, $4, $5, $6)`,
        [patientId, symptom?.trim()?.slice(0, 500) || null, idempotencyKey || null, apptCode, nextNum, todayStr]
      );

      // Đếm số người chờ trước
      const { rows: wc } = await tx.query(
        `SELECT COUNT(*) AS cnt FROM appointments
         WHERE queue_date = $1 AND status = 'scheduled' AND queue_number < $2`,
        [todayStr, nextNum]
      );

      return {
        queueNumber: nextNum,
        appointmentCode: apptCode,
        waitingAhead: parseInt(wc[0].cnt, 10),
        estimatedWaitMinutes: parseInt(wc[0].cnt, 10) * 15,
        duplicate: false,
      };
    });

    return NextResponse.json({
      ...result,
      message: result.duplicate ? "Số đã được cấp trước đó" : "Bốc số thành công",
    });
  } catch (e: any) {
    console.error("Queue error:", e.message);
    const known = ["Bệnh nhân đã có số thứ tự hôm nay", "Hôm nay đã hết số"];
    const msg = known.includes(e.message) ? e.message : "Lỗi hệ thống, vui lòng thử lại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
