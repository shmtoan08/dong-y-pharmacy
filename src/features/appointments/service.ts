import { withTransaction } from "@/lib/db";
import { getWorkingHours } from "@/features/schedules/service";
import { getQueueQuota } from "./queries";

// Các slot hợp lệ: 08:00-10:30 sáng, 14:00-16:00 chiều, mỗi 30 phút
export const VALID_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "14:00", "14:30", "15:00", "15:30", "16:00",
];

// Lấy thời gian hiện tại theo giờ Việt Nam
export function getVietnamTime(): { hour: number; minute: number; day: number; dateStr: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    hour: parseInt(parts.hour, 10),
    minute: parseInt(parts.minute, 10),
    day: weekdays[parts.weekday] ?? 1,
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export interface BookPublicAppointmentInput {
  date: string;
  timeSlot: string;
  doctorId?: string | null;
  patientName?: string;
  phone?: string;
  birthYear?: number | string;
  gender?: string;
  symptom?: string;
  idempotencyKey?: string;
  patientCode?: string;
}

export interface BookPublicAppointmentResult {
  appointmentCode: string;
  date: string;
  timeSlot: string;
  doctorName: string;
  duplicate: boolean;
}

/**
 * Đặt lịch hẹn khám trước trực tuyến từ cổng công khai
 */
export async function bookPublicAppointment(
  input: BookPublicAppointmentInput,
): Promise<BookPublicAppointmentResult> {
  const { date, timeSlot, doctorId, patientName, phone, birthYear, gender, symptom, idempotencyKey, patientCode } = input;

  const isExistingPatient = Boolean(patientCode?.trim());

  if (!date || !timeSlot) {
    throw new Error("Thiếu ngày hoặc giờ khám");
  }
  if (!VALID_SLOTS.includes(timeSlot)) {
    throw new Error("Khung giờ không hợp lệ");
  }

  let phoneClean = "";
  let by: number | null = null;
  let finalGender: string | null = null;
  let finalName = "";

  if (!isExistingPatient) {
    if (!patientName?.trim() || !phone?.trim()) {
      throw new Error("Thiếu thông tin bắt buộc");
    }
    phoneClean = phone.replace(/\D/g, "");
    if (!/^0\d{9}$/.test(phoneClean)) {
      throw new Error("SĐT không hợp lệ");
    }
    by = parseInt(String(birthYear || ""), 10);
    const curYear = new Date().getFullYear();
    if (!by || by < 1900 || by > curYear) {
      throw new Error("Năm sinh không hợp lệ");
    }
    if (!gender || !["male", "female"].includes(gender)) {
      throw new Error("Giới tính không hợp lệ");
    }
    finalGender = gender;
    finalName = patientName.trim();
  }

  const apptDate = new Date(`${date}T00:00:00+07:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(apptDate.getTime()) || apptDate < today) {
    throw new Error("Ngày không hợp lệ");
  }

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);
  if (apptDate > maxDate) {
    throw new Error("Chỉ đặt trước tối đa 30 ngày");
  }

  return await withTransaction(async (tx) => {
    if (idempotencyKey) {
      const { rows: existing } = await tx.query<{ appointment_code: string }>(
        `SELECT appointment_code FROM appointments WHERE idempotency_key = $1`,
        [idempotencyKey],
      );
      if (existing.length > 0) {
        return {
          appointmentCode: existing[0].appointment_code,
          date,
          timeSlot,
          doctorName: "",
          duplicate: true,
        };
      }
    }

    let patientId: string;
    if (isExistingPatient) {
      const { rows: byCode } = await tx.query<{ id: string }>(
        `SELECT id FROM patients WHERE patient_code = $1 LIMIT 1`,
        [patientCode!.trim().toUpperCase()],
      );
      if (byCode.length === 0) {
        throw new Error("Mã bệnh nhân không tồn tại. Vui lòng kiểm tra lại.");
      }
      patientId = byCode[0].id;
    } else {
      const { rows: found } = await tx.query<{ id: string }>(
        `SELECT id FROM patients WHERE REPLACE(REPLACE(phone, ' ', ''), '.', '') = $1 LIMIT 1`,
        [phoneClean],
      );
      if (found.length > 0) {
        patientId = found[0].id;
        await tx.query(
          `UPDATE patients SET date_of_birth = COALESCE(date_of_birth, $2), sex = COALESCE(sex, $3) WHERE id = $1`,
          [patientId, `${by}-01-01`, finalGender],
        );
      } else {
        const todayStr = new Date().toISOString().slice(0, 10);
        const { rows: seqRows } = await tx.query<{ n: number }>(`SELECT next_daily_n($1, 'patient') AS n`, [todayStr]);
        const ptCode = `BN-${todayStr.replace(/-/g, "")}-${String(seqRows[0].n).padStart(3, "0")}`;
        const { rows: newPt } = await tx.query<{ id: string }>(
          `INSERT INTO patients (patient_code, full_name, phone, date_of_birth, sex)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [ptCode, finalName, phoneClean, `${by}-01-01`, finalGender],
        );
        patientId = newPt[0].id;
      }
    }

    let practitionerId: string | null = null;
    let doctorName = "";
    if (doctorId) {
      const { rows: doc } = await tx.query<{ id: string; full_name: string }>(
        `SELECT id, full_name FROM users WHERE id = $1 AND role = 'practitioner' AND is_active = true`,
        [doctorId],
      );
      if (doc.length === 0) throw new Error("Bác sĩ không hợp lệ");
      practitionerId = doc[0].id;
      doctorName = doc[0].full_name;
    } else {
      const { rows: docs } = await tx.query<{ id: string; full_name: string }>(
        `SELECT id, full_name FROM users WHERE role = 'practitioner' AND is_active = true ORDER BY full_name`,
      );
      let assigned = false;
      for (const doc of docs) {
        const wh = await getWorkingHours(doc.id, date);
        if (!wh.working || !wh.slots.includes(timeSlot)) continue;
        const { rows: chk } = await tx.query<{ cnt: string }>(
          `SELECT COUNT(*) AS cnt FROM appointments
           WHERE practitioner_id = $1
             AND DATE(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = $2
             AND TO_CHAR(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI') = $3
             AND status IN ('scheduled', 'confirmed', 'checked_in')`,
          [doc.id, date, timeSlot],
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

    const { rows: slotCheck } = await tx.query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM appointments
       WHERE DATE(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = $1
         AND TO_CHAR(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI') = $2
         AND status IN ('confirmed', 'checked_in')
         AND practitioner_id = $3::uuid`,
      [date, timeSlot, practitionerId],
    );
    if (parseInt(slotCheck[0].cnt, 10) >= 1) {
      throw new Error("Khung giờ này đã có người đặt, vui lòng chọn khung giờ khác");
    }

    const { rows: appt } = await tx.query<{ appointment_code: string }>(
      `INSERT INTO appointments
         (patient_id, practitioner_id, scheduled_at, status, source, note, idempotency_key, appointment_code)
       VALUES ($1, $2, $3, 'confirmed', 'online', $4, $5, $6)
       RETURNING appointment_code`,
      [patientId, practitionerId, scheduledAt, symptom?.trim()?.slice(0, 500) || null, idempotencyKey || null, apptCode],
    );

    return {
      appointmentCode: appt[0].appointment_code,
      date,
      timeSlot,
      doctorName,
      duplicate: false,
    };
  });
}

export interface IssuePublicQueueNumberInput {
  patientName?: string;
  phone?: string;
  birthYear?: number | string;
  gender?: string;
  symptom?: string;
  idempotencyKey?: string;
  patientCode?: string;
}

export interface IssuePublicQueueNumberResult {
  queueNumber: number;
  appointmentCode: string;
  waitingAhead: number;
  estimatedWaitMinutes: number;
  duplicate: boolean;
}

/**
 * Bốc số thứ tự khám trực tuyến trong ngày
 */
export async function issuePublicQueueNumber(
  input: IssuePublicQueueNumberInput,
): Promise<IssuePublicQueueNumberResult> {
  const { patientName, phone, birthYear, gender, symptom, idempotencyKey, patientCode } = input;
  const isExistingPatient = Boolean(patientCode?.trim());

  let phoneClean = "";
  let by: number | null = null;
  let finalGender: string | null = null;

  if (!isExistingPatient) {
    if (!patientName?.trim() || !phone?.trim()) {
      throw new Error("Thiếu họ tên hoặc SĐT");
    }
    phoneClean = phone.replace(/\D/g, "");
    if (!/^0\d{9}$/.test(phoneClean)) {
      throw new Error("SĐT không hợp lệ");
    }
    by = parseInt(String(birthYear || ""), 10);
    const cy = new Date().getFullYear();
    if (!/^\d{4}$/.test(String(birthYear || "").trim()) || by < 1930 || by > cy) {
      throw new Error("Năm sinh không hợp lệ");
    }
    if (!gender || !["male", "female"].includes(gender)) {
      throw new Error("Giới tính không hợp lệ");
    }
    finalGender = gender;
  }

  const vn = getVietnamTime();
  const hour = vn.hour + vn.minute / 60;
  const day = vn.day;
  const todayStr = vn.dateStr;

  if (day === 0) {
    throw new Error("Phòng khám nghỉ Chủ nhật");
  }
  if (hour < 8 || hour >= 17) {
    throw new Error("Ngoài giờ nhận bệnh (8:00-17:00)");
  }

  return await withTransaction(async (tx) => {
    if (idempotencyKey) {
      const { rows: ex } = await tx.query<{ queue_number: number }>(
        `SELECT queue_number FROM appointments WHERE idempotency_key = $1`,
        [idempotencyKey],
      );
      if (ex.length > 0) {
        return {
          queueNumber: ex[0].queue_number,
          appointmentCode: "",
          waitingAhead: 0,
          estimatedWaitMinutes: 0,
          duplicate: true,
        };
      }
    }

    let activeRows: Array<{ id: string }> = [];
    if (isExistingPatient) {
      const { rows } = await tx.query<{ id: string }>(
        `SELECT a.id FROM appointments a
         JOIN patients p ON p.id = a.patient_id
         WHERE a.queue_date = $1 AND a.status IN ('scheduled', 'confirmed', 'checked_in')
           AND a.queue_number IS NOT NULL
           AND p.patient_code = $2
         LIMIT 1`,
        [todayStr, patientCode!.trim().toUpperCase()],
      );
      activeRows = rows;
    } else {
      const { rows } = await tx.query<{ id: string }>(
        `SELECT a.id FROM appointments a
         JOIN patients p ON p.id = a.patient_id
         WHERE a.queue_date = $1 AND a.status IN ('scheduled', 'confirmed', 'checked_in')
           AND a.queue_number IS NOT NULL
           AND REPLACE(REPLACE(p.phone, ' ', ''), '.', '') = $2
           AND p.full_name ILIKE $3
         LIMIT 1`,
        [todayStr, phoneClean, patientName!.trim()],
      );
      activeRows = rows;
    }
    if (activeRows.length > 0) {
      throw new Error("Bệnh nhân đã có số thứ tự hôm nay");
    }

    await tx.query(
      `INSERT INTO daily_queues (queue_date, last_number) VALUES ($1, 0)
       ON CONFLICT (queue_date) DO NOTHING`,
      [todayStr],
    );
    const { rows: counter } = await tx.query<{ last_number: number }>(
      `SELECT last_number FROM daily_queues WHERE queue_date = $1 FOR UPDATE`,
      [todayStr],
    );
    const nextNum = counter[0].last_number + 1;

    const quota = await getQueueQuota();
    if (nextNum > quota) {
      throw new Error("Hôm nay đã hết số, vui lòng quay lại ngày mai");
    }

    await tx.query(
      `UPDATE daily_queues SET last_number = $1 WHERE queue_date = $2`,
      [nextNum, todayStr],
    );

    let patientId: string;
    if (isExistingPatient) {
      const { rows: byCode } = await tx.query<{ id: string; full_name: string }>(
        `SELECT id, full_name FROM patients WHERE patient_code = $1 LIMIT 1`,
        [patientCode!.trim().toUpperCase()],
      );
      if (byCode.length === 0) {
        throw new Error("Mã bệnh nhân không tồn tại. Vui lòng kiểm tra lại.");
      }
      patientId = byCode[0].id;
    } else {
      const { rows: found } = await tx.query<{ id: string }>(
        `SELECT id FROM patients WHERE REPLACE(REPLACE(phone, ' ', ''), '.', '') = $1 AND full_name ILIKE $2 LIMIT 1`,
        [phoneClean, patientName!.trim()],
      );
      if (found.length > 0) {
        patientId = found[0].id;
      } else {
        const dStr = new Date().toISOString().slice(0, 10);
        const { rows: seq } = await tx.query<{ n: number }>(`SELECT next_daily_n($1, 'patient') AS n`, [dStr]);
        const ptCode = `BN-${dStr.replace(/-/g, "")}-${String(seq[0].n).padStart(3, "0")}`;
        const { rows: np } = await tx.query<{ id: string }>(
          `INSERT INTO patients (patient_code, full_name, phone, date_of_birth, sex)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [ptCode, patientName!.trim(), phoneClean, `${by}-01-01`, finalGender],
        );
        patientId = np[0].id;
      }
    }

    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const apptCode = `LH-${todayStr.replace(/-/g, "")}-${rand}`;
    await tx.query(
      `INSERT INTO appointments
         (patient_id, scheduled_at, status, source, note, idempotency_key, appointment_code, queue_number, queue_date, confirmed_at)
       VALUES ($1, NOW(), 'confirmed', 'online', $2, $3, $4, $5, $6, NOW())`,
      [patientId, symptom?.trim()?.slice(0, 500) || null, idempotencyKey || null, apptCode, nextNum, todayStr],
    );

    const { rows: wc } = await tx.query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM appointments
       WHERE queue_date = $1 AND status = 'confirmed' AND queue_number < $2`,
      [todayStr, nextNum],
    );

    const waitingAhead = parseInt(wc[0]?.cnt || "0", 10);

    return {
      queueNumber: nextNum,
      appointmentCode: apptCode,
      waitingAhead,
      estimatedWaitMinutes: waitingAhead * 15,
      duplicate: false,
    };
  });
}
