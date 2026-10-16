import { NextResponse } from "next/server";
import { lookupPatientByCode } from "@/features/patients/queries";

export const dynamic = "force-dynamic";

function checkApiKey(req: Request): boolean {
  const key = req.headers.get("authorization")?.replace("Bearer ", "");
  const expected = process.env.BOOKING_API_KEY;
  if (!expected || !key) return false;
  return key === expected;
}

// GET /api/public/patients/lookup?code=BN-xxx — tra cứu bệnh nhân thường xuyên
export async function GET(req: Request) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") || "").trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ error: "Thiếu mã bệnh nhân" }, { status: 400 });
  }

  const patient = await lookupPatientByCode(code);
  if (!patient) {
    return NextResponse.json({ error: "Không tìm thấy mã bệnh nhân" }, { status: 404 });
  }

  return NextResponse.json({ patient });
}
