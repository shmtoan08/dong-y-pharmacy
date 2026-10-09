import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

  const { rows } = await db.query(
    `SELECT key, value FROM system_settings
     WHERE key IN ('clinic_name', 'clinic_phone', 'clinic_address', 'clinic_license_number', 'working_hours')`
  );
  const info: Record<string, string> = {};
  for (const r of rows) info[r.key] = r.value;

  return NextResponse.json({
    name: info.clinic_name || "Đông Y Đường",
    phone: info.clinic_phone || "0901234567",
    address: info.clinic_address || "",
    license: info.clinic_license_number || "",
    workingHours: info.working_hours || "T2 - T7: 08:00 - 17:00 (Nghỉ Chủ nhật)",
  });
}
