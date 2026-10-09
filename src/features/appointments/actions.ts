"use server";

import { db, withTransaction } from "@/lib/db";
import { requireRole, getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { nextPatientCode } from "@/features/patients/actions";

/* ==================== LỊCH HẸN ==================== */

export type AppointmentStatus = "scheduled" | "confirmed" | "checked_in" | "completed" | "cancelled" | "no_show";

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

export async function getTodayStats(date: string): Promise<Record<AppointmentStatus, number>> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query(
    `SELECT status, COUNT(*) AS c FROM appointments
     WHERE scheduled_at >= $1::date AND scheduled_at < ($1::date + interval '1 day')
     GROUP BY status`,
    [date],
  );
  const stats: Record<AppointmentStatus, number> = {
    scheduled: 0, confirmed: 0, checked_in: 0, completed: 0, cancelled: 0, no_show: 0,
  };
  for (const r of rows) stats[r.status as AppointmentStatus] = Number(r.c);
  return stats;
}

export async function createAppointment(data: {
  patient_id: string;
  practitioner_id?: string | null;
  scheduled_at: string;
  reason?: string;
  note?: string;
}): Promise<{ id?: string; error?: string }> {
  const user = await requireRole("admin", "practitioner");
  if (!data.patient_id) return { error: "Chưa chọn bệnh nhân." };
  if (!data.scheduled_at) return { error: "Chưa chọn ngày giờ." };

  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO appointments (patient_id, practitioner_id, scheduled_at, reason, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      data.patient_id,
      data.practitioner_id || null,
      data.scheduled_at,
      data.reason?.trim() || null,
      data.note?.trim() || null,
      user.id,
    ],
  );
  await audit({ userId: user.id, action: "APPOINTMENT_CREATE", tableName: "appointments", rowId: rows[0].id });
  return { id: rows[0].id };
}

export async function updateAppointment(
  id: string,
  data: { practitioner_id?: string | null; scheduled_at?: string; reason?: string; note?: string },
): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [];
  if (data.practitioner_id !== undefined) {
    params.push(data.practitioner_id || null);
    sets.push(`practitioner_id = $${params.length}`);
  }
  if (data.scheduled_at) {
    params.push(data.scheduled_at);
    sets.push(`scheduled_at = $${params.length}`);
  }
  if (data.reason !== undefined) {
    params.push(data.reason?.trim() || null);
    sets.push(`reason = $${params.length}`);
  }
  if (data.note !== undefined) {
    params.push(data.note?.trim() || null);
    sets.push(`note = $${params.length}`);
  }
  params.push(id);
  const { rowCount } = await db.query(
    `UPDATE appointments SET ${sets.join(", ")} WHERE id = $${params.length} AND status = 'scheduled'`,
    params,
  );
  if (rowCount === 0) return { error: "Chỉ sửa được lịch chưa tiếp đón." };
  await audit({ userId: user.id, action: "APPOINTMENT_UPDATE", tableName: "appointments", rowId: id });
  return {};
}

/** Tiếp đón: scheduled → checked_in */
export async function checkInAppointment(id: string): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  const { rowCount } = await db.query(
    `UPDATE appointments SET status = 'checked_in', updated_at = NOW()
     WHERE id = $1 AND status = 'scheduled'`,
    [id],
  );
  if (rowCount === 0) return { error: "Lịch không ở trạng thái chờ." };
  await audit({ userId: user.id, action: "APPOINTMENT_CHECKIN", tableName: "appointments", rowId: id });
  return {};
}

/**
 * Tạo lượt khám từ lịch hẹn — transaction + UNIQUE(appointment_id).
 * Chống double-click tạo 2 visit.
 */
export async function createVisitFromAppointment(
  appointmentId: string,
): Promise<{ visitId?: string; error?: string }> {
  const user = await requireRole("admin", "practitioner");

  try {
    let visitId = "";
    await withTransaction(async (tx) => {
      const { rows } = await tx.query<{
        patient_id: string; practitioner_id: string | null; status: string; reason: string | null;
      }>(
        `SELECT patient_id, practitioner_id, status, reason FROM appointments WHERE id = $1 FOR UPDATE`,
        [appointmentId],
      );
      if (rows.length === 0) throw new Error("NOT_FOUND");
      if (rows[0].status !== "checked_in") throw new Error("NOT_CHECKED_IN");

      // Kiểm tra đã có visit chưa
      const { rows: ex } = await tx.query(
        `SELECT id FROM visits WHERE appointment_id = $1`,
        [appointmentId],
      );
      if (ex.length > 0) {
        visitId = ex[0].id;
        return; // Đã có visit, trả về luôn
      }

      const { rows: v } = await tx.query<{ id: string }>(
        `INSERT INTO visits (patient_id, practitioner_id, visited_at, appointment_id, inquiry_notes)
         VALUES ($1, $2, NOW(), $3, $4) RETURNING id`,
        [rows[0].patient_id, rows[0].practitioner_id ?? user.id, appointmentId, rows[0].reason],
      );
      visitId = v[0].id;

      await tx.query(
        `UPDATE appointments SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [appointmentId],
      );
    });

    await audit({ userId: user.id, action: "APPOINTMENT_CREATE_VISIT", tableName: "appointments", rowId: appointmentId });
    return { visitId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return { error: "Không tìm thấy lịch hẹn." };
    if (msg === "NOT_CHECKED_IN") return { error: "Phải tiếp đón trước khi tạo lượt khám." };
    console.error("[createVisitFromAppointment] failed:", e);
    return { error: "Tạo lượt khám thất bại." };
  }
}

export async function cancelAppointment(id: string): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  const { rowCount } = await db.query(
    `UPDATE appointments SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND status IN ('scheduled', 'checked_in')`,
    [id],
  );
  if (rowCount === 0) return { error: "Không thể hủy lịch ở trạng thái này." };
  await audit({ userId: user.id, action: "APPOINTMENT_CANCEL", tableName: "appointments", rowId: id });
  return {};
}

export async function markNoShow(id: string): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  const { rowCount } = await db.query(
    `UPDATE appointments SET status = 'no_show', updated_at = NOW()
     WHERE id = $1 AND status = 'scheduled'`,
    [id],
  );
  if (rowCount === 0) return { error: "Không thể đánh dấu ở trạng thái này." };
  await audit({ userId: user.id, action: "APPOINTMENT_NOSHOW", tableName: "appointments", rowId: id });
  return {};
}


/** Dời lịch: đổi ngày giờ hẹn (chỉ khi chưa tiếp đón) */
export async function rescheduleAppointment(
  id: string,
  scheduledAt: string,
): Promise<{ error?: string }> {
  const user = await requireRole("admin", "practitioner");
  if (!scheduledAt) return { error: "Chưa chọn ngày giờ mới." };
  const { rowCount } = await db.query(
    `UPDATE appointments SET scheduled_at = $1, updated_at = NOW()
     WHERE id = $2 AND status = 'scheduled'`,
    [scheduledAt, id],
  );
  if (rowCount === 0) return { error: "Chỉ dời được lịch chưa tiếp đón." };
  await audit({ userId: user.id, action: "APPOINTMENT_RESCHEDULE", tableName: "appointments", rowId: id, newValue: { scheduledAt } });
  return {};
}

/** Chi tiết 1 lịch hẹn */
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


/** Tạo nhanh bệnh nhân (từ form đặt lịch) */
export async function quickCreatePatient(
  fullName: string,
  phone?: string,
): Promise<{ id?: string; error?: string }> {
  const user = await requireRole("admin", "practitioner");
  if (!fullName.trim()) return { error: "Chưa nhập họ tên." };
  const code = await nextPatientCode();
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO patients (patient_code, full_name, phone) VALUES ($1, $2, $3) RETURNING id`,
    [code, fullName.trim(), phone?.trim() || null],
  );
  return { id: rows[0].id };
}
