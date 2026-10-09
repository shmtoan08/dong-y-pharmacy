import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";

function checkApiKey(req: Request): boolean {
  const key = req.headers.get("authorization")?.replace("Bearer ", "");
  const expected = process.env.BOOKING_API_KEY;
  if (!expected || !key) return false;
  return key === expected;
}

// POST /api/public/appointments — tạo lịch hẹn từ web booking
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

  const { date, timeSlot, doctorId, patientName, phone, symptom, idempotencyKey } = body;

  if (!date || !timeSlot || !patientName?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }
  if (!["morning", "afternoon"].includes(timeSlot)) {
    return NextResponse.json({ error: "Khung giờ không hợp lệ" }, { status: 400 });
  }
  const phoneClean = phone.replace(/\D/g, "");
  if (!/^0\d{9}$/.test(phoneClean)) {
    return NextResponse.json({ error: "SĐT không hợp lệ" }, { status: 400 });
  }

  const apptDate = new Date(date + "T00:00:00+07:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(apptDate.getTime()) || apptDate < today) {
    return NextResponse.json({ error: "Ngày không hợp lệ" }, { status: 400 });
  }
  if (apptDate.getDay() === 0) {
    return NextResponse.json({ error: "Phòng khám nghỉ Chủ nhật" }, { status: 400 });
  }
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);
  if (apptDate > maxDate) {
    return NextResponse.json({ error: "Chỉ đặt trước tối đa 30 ngày" }, { status: 400 });
  }

  try {
    const result = await withTransaction(async (tx) => {
      // Idempotency
      if (idempotencyKey) {
        const { rows: existing } = await tx.query(
          `SELECT appointment_code FROM appointments WHERE idempotency_key = $1`,
          [idempotencyKey]
        );
        if (existing.length > 0) {
          return { appointmentCode: existing[0].appointment_code, duplicate: true };
        }
      }

      // Tìm bệnh nhân theo SĐT
      let patientId: string;
      const { rows: found } = await tx.query(
        `SELECT id FROM patients WHERE REPLACE(REPLACE(phone, ' ', ''), '.', '') = $1 LIMIT 1`,
        [phoneClean]
      );
      if (found.length > 0) {
        patientId = found[0].id;
      } else {
        // Tạo mã BN: BN-YYYYMMDD-XXX
        const todayStr = new Date().toISOString().slice(0, 10);
        const { rows: seqRows } = await tx.query(
          `SELECT next_daily_n($1, 'patient') AS n`,
          [todayStr]
        );
        const seqN = seqRows[0].n;
        const ptCode = `BN-${todayStr.replace(/-/g, "")}-${String(seqN).padStart(3, "0")}`;
        const { rows: newPt } = await tx.query(
          `INSERT INTO patients (patient_code, full_name, phone) VALUES ($1, $2, $3) RETURNING id`,
          [ptCode, patientName.trim(), phoneClean]
        );
        patientId = newPt[0].id;
      }

      // Kiểm tra bác sĩ
      let practitionerId: string | null = null;
      let doctorName = "Bác sĩ bất kỳ";
      if (doctorId) {
        const { rows: doc } = await tx.query(
          `SELECT id, full_name FROM users WHERE id = $1 AND role = 'practitioner' AND is_active = true`,
          [doctorId]
        );
        if (doc.length === 0) throw new Error("Bác sĩ không hợp lệ");
        practitionerId = doc[0].id;
        doctorName = doc[0].full_name;
      }

      const hour = timeSlot === "morning" ? "08:00" : "14:00";
      const scheduledAt = `${date}T${hour}:00+07:00`;
      const dateStr = date.replace(/-/g, "");
      const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
      const apptCode = `LH-${dateStr}-${rand}`;

      const { rows: appt } = await tx.query(
        `INSERT INTO appointments
           (patient_id, practitioner_id, scheduled_at, status, source, note, idempotency_key, appointment_code)
         VALUES ($1, $2, $3, 'scheduled', 'online', $4, $5, $6)
         RETURNING appointment_code`,
        [patientId, practitionerId, scheduledAt, symptom?.trim()?.slice(0, 500) || null, idempotencyKey || null, apptCode]
      );

      return {
        appointmentCode: appt[0].appointment_code,
        date,
        timeSlot: timeSlot === "morning" ? "Sáng (8h-11h)" : "Chiều (14h-17h)",
        doctorName,
        duplicate: false,
      };
    });

    return NextResponse.json({ ...result, message: result.duplicate ? "Lịch hẹn đã được tạo trước đó" : "Đặt lịch thành công" });
  } catch (e: any) {
    console.error("Public appointment error:", e.message);
    const msg = e.message === "Bác sĩ không hợp lệ" ? e.message : "Lỗi hệ thống, vui lòng thử lại";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
