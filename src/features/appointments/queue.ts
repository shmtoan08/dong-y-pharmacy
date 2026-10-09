"use server";

import { db, withTransaction } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface QueueItem {
  id: string;
  queue_number: number;
  patient_name: string;
  phone: string;
  status: string;
  appointment_code: string;
  scheduled_at: string;
}

// Lấy hàng đợi hôm nay
export async function getTodayQueue(): Promise<QueueItem[]> {
  const user = await requireUser();
  if (!["admin", "practitioner", "dispenser"].includes(user.role)) {
    throw new Error("Không có quyền");
  }
  const todayStr = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
    .toISOString().slice(0, 10);

  const { rows } = await db.query<QueueItem>(
    `SELECT a.id, a.queue_number, p.full_name AS patient_name, p.phone,
            a.status, a.appointment_code, a.scheduled_at
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     WHERE a.queue_date = $1 AND a.queue_number IS NOT NULL
       AND a.status IN ('scheduled', 'checked_in')
     ORDER BY a.queue_number`,
    [todayStr]
  );
  return rows;
}

// Gọi số tiếp theo (chuyển scheduled -> checked_in)
export async function callNextNumber(queueNumber: number) {
  const user = await requireUser();
  if (!["admin", "practitioner"].includes(user.role)) {
    throw new Error("Không có quyền");
  }
  const todayStr = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
    .toISOString().slice(0, 10);

  await withTransaction(async (tx) => {
    // Đánh dấu số đang khám hiện tại thành completed
    await tx.query(
      `UPDATE appointments SET status = 'completed'
       WHERE queue_date = $1 AND status = 'checked_in' AND queue_number IS NOT NULL`,
      [todayStr]
    );
    // Gọi số mới
    const { rowCount } = await tx.query(
      `UPDATE appointments SET status = 'checked_in'
       WHERE queue_date = $1 AND queue_number = $2 AND status = 'scheduled'`,
      [todayStr, queueNumber]
    );
    if (rowCount === 0) throw new Error("Số không hợp lệ hoặc đã được gọi");
  });

  revalidatePath("/appointments/queue");
}

// Hoàn tất lượt khám
export async function completeQueueNumber(queueNumber: number) {
  const user = await requireUser();
  if (!["admin", "practitioner"].includes(user.role)) {
    throw new Error("Không có quyền");
  }
  const todayStr = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
    .toISOString().slice(0, 10);

  await db.query(
    `UPDATE appointments SET status = 'completed'
     WHERE queue_date = $1 AND queue_number = $2 AND status = 'checked_in'`,
    [todayStr, queueNumber]
  );
  revalidatePath("/appointments/queue");
}

// Hủy số
export async function cancelQueueNumber(id: string) {
  const user = await requireUser();
  if (!["admin", "practitioner"].includes(user.role)) {
    throw new Error("Không có quyền");
  }
  await db.query(
    `UPDATE appointments SET status = 'cancelled' WHERE id = $1`,
    [id]
  );
  revalidatePath("/appointments/queue");
}
