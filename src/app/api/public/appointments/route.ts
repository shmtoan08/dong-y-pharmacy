export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withTransaction, db } from "@/lib/db";
import { getWorkingHours } from "@/features/schedules/service";

function checkApiKey(req: Request): boolean {
  const key = req.headers.get("authorization")?.replace("Bearer ", "");
  const expected = process.env.BOOKING_API_KEY;
  if (!expected || !key) return false;
  return key === expected;
}

// Các slot hợp lệ: 08:00-10:30 sáng, 14:00-16:00 chiều, mỗi 30 phút
const VALID_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "14:00", "14:30", "15:00", "15:30", "16:00",
];

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

  const { date, timeSlot, doctorId, patientName, phone, birthYear, gender, symptom, idempotencyKey, patientCode } = body;

  // Benh nhan co san (gui patientCode): chi check ton tai, khong validate them
  const isExistingPatient = !!patientCode?.trim();

  if (!date || !timeSlot) {
    return NextResponse.json({ error: "Thiếu ngày hoặc giờ khám" }, { status: 400 });
  }
  if (!VALID_SLOTS.includes(timeSlot)) {
    return NextResponse.json({ error: "Khung giờ không hợp lệ" }, { status: 400 });
  }

  let phoneClean = "";
  let by: number | null = null;
  let finalGender: string | null = null;
  let finalName = "";

  if (!isExistingPatient) {
    if (!patientName?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }
    phoneClean = phone.replace(/\D/g, "");
    if (!/^0\d{9}$/.test(phoneClean)) {
      return NextResponse.json({ error: "SĐT không hợp lệ" }, { status: 400 });
    }
    by = parseInt(birthYear, 10);
    const curYear = new Date().getFullYear();
    if (!by || by < 1900 || by > curYear) {
      return NextResponse.json({ error: "Năm sinh không hợp lệ" }, { status: 400 });
    }
    if (!["male", "female"].includes(gender)) {
      return NextResponse.json({ error: "Giới tính không hợp lệ" }, { status: 400 });
    }
    finalGender = gender;
    finalName = patientName.trim();
  }

  const apptDate = new Date(date + "T00:00:00+07:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(apptDate.getTime()) || apptDate < today) {
    return NextResponse.json({ error: "Ngày không hợp lệ" }, { status: 400 });
  }
  // Khong check cung CN nua - lich lam viec cua tung BS da xu ly
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);
  if (apptDate > maxDate) {
    return NextResponse.json({ error: "Chỉ đặt trước tối đa 30 ngày" }, { status: 400 });
  }

  try {
    const result = await withTransaction(async (tx) => {
      if (idempotencyKey) {
        const { rows: existing } = await tx.query(
          `SELECT appointment_code FROM appointments WHERE idempotency_key = $1`,
          [idempotencyKey]
        );
        if (existing.length > 0) {
          return { appointmentCode: existing[0].appointment_code, duplicate: true };
        }
      }

      // Benh nhan co san: tim theo ma BN
      let patientId: string;
      if (isExistingPatient) {
        const { rows: byCode } = await tx.query(
          `SELECT id FROM patients WHERE patient_code = $1 LIMIT 1`,
          [patientCode.trim().toUpperCase()]
        );
        if (byCode.length === 0) {
          throw new Error("Mã bệnh nhân không tồn tại. Vui lòng kiểm tra lại.");
        }
        patientId = byCode[0].id;
      } else {
        // Khach vang lai: tim theo SDT hoac tao moi
        const { rows: found } = await tx.query(
          `SELECT id FROM patients WHERE REPLACE(REPLACE(phone, ' ', ''), '.', '') = $1 LIMIT 1`,
          [phoneClean]
        );
        if (found.length > 0) {
          patientId = found[0].id;
          await tx.query(
            `UPDATE patients SET date_of_birth = COALESCE(date_of_birth, $2), sex = COALESCE(sex, $3) WHERE id = $1`,
            [patientId, `${by}-01-01`, finalGender]
          );
        } else {
          const todayStr = new Date().toISOString().slice(0, 10);
          const { rows: seqRows } = await tx.query(`SELECT next_daily_n($1, 'patient') AS n`, [todayStr]);
          const ptCode = `BN-${todayStr.replace(/-/g, "")}-${String(seqRows[0].n).padStart(3, "0")}`;
          const { rows: newPt } = await tx.query(
            `INSERT INTO patients (patient_code, full_name, phone, date_of_birth, sex)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [ptCode, finalName, phoneClean, `${by}-01-01`, finalGender]
          );
          patientId = newPt[0].id;
        }
      }

      // Kiểm tra bác sĩ
      let practitionerId: string | null = null;
      let doctorName = "";
      if (doctorId) {
        const { rows: doc } = await tx.query(
          `SELECT id, full_name FROM users WHERE id = $1 AND role = 'practitioner' AND is_active = true`,
          [doctorId]
        );
        if (doc.length === 0) throw new Error("Bác sĩ không hợp lệ");
        practitionerId = doc[0].id;
        doctorName = doc[0].full_name;
      } else {
        // "Bac si bat ky": tu dong gan BS dang ranh slot nay
        const { rows: docs } = await tx.query(
          `SELECT id, full_name FROM users WHERE role = 'practitioner' AND is_active = true ORDER BY full_name`
        );
        let assigned = false;
        for (const doc of docs) {
          const wh = await getWorkingHours(doc.id, date);
          if (!wh.working || !wh.slots.includes(timeSlot)) continue;
          const { rows: chk } = await tx.query(
            `SELECT COUNT(*) AS cnt FROM appointments
             WHERE practitioner_id = $1
               AND DATE(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = $2
               AND TO_CHAR(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI') = $3
               AND status IN ('scheduled', 'confirmed', 'checked_in')`,
            [doc.id, date, timeSlot]
          );
          if (parseInt(chk[0].cnt, 10) < 1) {
            practitionerId = doc.id;
            doctorName = doc.full_name;
            assigned = true;
            break;
          }
        }
        if (!assigned) throw new Error("Khung giờ này đã hết chỗ");
      }

      // Kiem tra bac si co lam viec ngay nay khong
      const wh = await getWorkingHours(practitionerId || "", date);
      if (!wh.working) {
        throw new Error(wh.reason || "Bác sĩ không làm việc ngày này");
      }
      if (!wh.slots.includes(timeSlot)) {
        throw new Error("Khung giờ này nằm ngoài giờ làm việc của bác sĩ");
      }

      const scheduledAt = `${date}T${timeSlot}:00+07:00`;
      const dateStr = date.replace(/-/g, "");
      const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
      const apptCode = `LH-${dateStr}-${rand}`;

      // Kiem tra slot con trong (chong double-booking)
      const { rows: slotCheck } = await tx.query(
        `SELECT COUNT(*) AS cnt FROM appointments
         WHERE DATE(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = $1
           AND TO_CHAR(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI') = $2
           AND status IN ('confirmed', 'checked_in')
           AND ($3::uuid IS NULL OR practitioner_id = $3::uuid OR practitioner_id IS NULL)`,
        [date, timeSlot, practitionerId]
      );
      if (parseInt(slotCheck[0].cnt, 10) >= 1) {
        throw new Error("Khung giờ này đã có người đặt, vui lòng chọn khung giờ khác");
      }

      const { rows: appt } = await tx.query(
        `INSERT INTO appointments
           (patient_id, practitioner_id, scheduled_at, status, source, note, idempotency_key, appointment_code)
         VALUES ($1, $2, $3, 'confirmed', 'online', $4, $5, $6)
         RETURNING appointment_code`,
        [patientId, practitionerId, scheduledAt, symptom?.trim()?.slice(0, 500) || null, idempotencyKey || null, apptCode]
      );

      return {
        appointmentCode: appt[0].appointment_code,
        date,
        timeSlot,
        doctorName,
        duplicate: false,
      };
    });

    return NextResponse.json({ ...result, message: result.duplicate ? "Lịch hẹn đã được tạo trước đó" : "Đặt lịch thành công" });
  } catch (e: any) {
    console.error("Public appointment error:", e.message);
    const friendly = ["Bác sĩ không hợp lệ", "Khung giờ này đã có người đặt", "Bác sĩ nghỉ", "ngoài giờ làm việc"];
    const msg = friendly.some((f) => e.message?.includes(f)) ? e.message : "Lỗi hệ thống, vui lòng thử lại";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/public/appointments/lookup?phone=... — tra cứu lịch hẹn theo SĐT
