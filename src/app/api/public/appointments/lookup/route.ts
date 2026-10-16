import { NextResponse } from "next/server";
import { lookupAppointmentsByPhone } from "@/features/appointments/queries";

export const dynamic = "force-dynamic";

function checkApiKey(req: Request): boolean {
  const key = req.headers.get("authorization")?.replace("Bearer ", "");
  const expected = process.env.BOOKING_API_KEY;
  if (!expected || !key) return false;
  return key === expected;
}

// GET /api/public/appointments/lookup?phone=... — tra cứu lịch hẹn
export async function GET(req: Request) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const phone = (searchParams.get("phone") || "").replace(/\D/g, "");
  if (!/^0\d{9}$/.test(phone)) {
    return NextResponse.json({ error: "SĐT không hợp lệ" }, { status: 400 });
  }

  const appointments = await lookupAppointmentsByPhone(phone);

  return NextResponse.json({
    appointments,
  });
}
