import { NextResponse } from "next/server";
import { getPublicDoctors } from "@/features/users/queries";

export const dynamic = "force-dynamic";

function checkApiKey(req: Request): boolean {
  const key = req.headers.get("authorization")?.replace("Bearer ", "");
  const expected = process.env.BOOKING_API_KEY;
  if (!expected || !key) return false;
  return key === expected;
}

// GET /api/public/doctors — danh sách bác sĩ nhận lịch online
export async function GET(req: Request) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doctors = await getPublicDoctors();
  return NextResponse.json({ doctors });
}
