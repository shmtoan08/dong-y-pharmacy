import { NextResponse } from "next/server";
import { getPublicClinicInfo } from "@/features/admin/settings";

function checkApiKey(req: Request): boolean {
  const key = req.headers.get("authorization")?.replace("Bearer ", "");
  const expected = process.env.BOOKING_API_KEY;
  if (!expected || !key) return false;
  return key === expected;
}

// GET /api/public/clinic-info — thông tin public của phòng khám
export async function GET(req: Request) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const info = await getPublicClinicInfo();
  return NextResponse.json(info);
}
