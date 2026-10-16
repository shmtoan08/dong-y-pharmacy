export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { bookPublicAppointment, BookPublicAppointmentInput } from "@/features/appointments/service";

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

  let body: BookPublicAppointmentInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await bookPublicAppointment(body);
    return NextResponse.json({
      ...result,
      message: result.duplicate ? "Lịch hẹn đã được tạo trước đó" : "Đặt lịch thành công",
    });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : "Lỗi hệ thống, vui lòng thử lại";
    console.error("Public appointment error:", errorMsg);

    const friendly = [
      "Bác sĩ không hợp lệ",
      "Khung giờ này đã có người đặt",
      "Khung giờ này đã hết chỗ",
      "Bác sĩ nghỉ",
      "ngoài giờ làm việc",
      "không làm việc ngày này",
      "Thiếu thông tin",
      "Thiếu ngày hoặc giờ khám",
      "Khung giờ không hợp lệ",
      "SĐT không hợp lệ",
      "Năm sinh không hợp lệ",
      "Giới tính không hợp lệ",
      "Ngày không hợp lệ",
      "Chỉ đặt trước tối đa 30 ngày",
      "Mã bệnh nhân không tồn tại",
    ];

    const isClientError = friendly.some((f) => errorMsg.includes(f));
    const msg = isClientError ? errorMsg : "Lỗi hệ thống, vui lòng thử lại";
    return NextResponse.json({ error: msg }, { status: isClientError ? 400 : 500 });
  }
}
