export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { issuePublicQueueNumber, IssuePublicQueueNumberInput } from "@/features/appointments/service";

function checkApiKey(req: Request): boolean {
  const key = req.headers.get("authorization")?.replace("Bearer ", "");
  const expected = process.env.BOOKING_API_KEY;
  if (!expected || !key) return false;
  return key === expected;
}

// POST /api/public/queue — bốc số khám trong ngày
export async function POST(req: Request) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: IssuePublicQueueNumberInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await issuePublicQueueNumber(body);

    return NextResponse.json({
      ...result,
      message: result.duplicate ? "Số đã được cấp trước đó" : "Bốc số thành công",
    });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : "Lỗi hệ thống, vui lòng thử lại";
    console.error("Queue error:", errorMsg);

    const known = [
      "Bệnh nhân đã có số thứ tự hôm nay",
      "Hôm nay đã hết số, vui lòng quay lại ngày mai",
      "Mã bệnh nhân không tồn tại. Vui lòng kiểm tra lại.",
      "Thiếu họ tên hoặc SĐT",
      "SĐT không hợp lệ",
      "Năm sinh không hợp lệ",
      "Giới tính không hợp lệ",
      "Phòng khám nghỉ Chủ nhật",
      "Ngoài giờ nhận bệnh (8:00-17:00)",
    ];
    const msg = known.includes(errorMsg) ? errorMsg : "Lỗi hệ thống, vui lòng thử lại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
