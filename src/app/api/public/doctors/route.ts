import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

  const { rows } = await db.query(
    `SELECT id, full_name AS name,
            COALESCE(specialty, 'Đa khoa') AS specialty,
            avatar_url, degree, experience_years
     FROM users
     WHERE role = 'practitioner' AND is_active = true
     ORDER BY full_name`
  );

  return NextResponse.json({
    doctors: rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      specialty: r.specialty,
      avatarUrl: r.avatar_url || null,
      degree: r.degree || null,
      experienceYears: r.experience_years || null,
      acceptingBookings: true,
    })),
  });
}
