import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function canManage(role: string): boolean {
  return role === "admin" || role === "practitioner";
}

// API nội bộ cho sidebar badge — không import từ file "use server"
export async function GET() {
  try {
    const user = await requireUser();
    if (!canManage(user.role)) return NextResponse.json({ count: 0 });

    let where = `a.source = 'online' AND a.status = 'scheduled' AND a.queue_number IS NULL`;
    const params: unknown[] = [];
    if (user.role === "practitioner") {
      params.push(user.id);
      where += ` AND a.practitioner_id = $1`;
    }

    const { rows } = await db.query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM appointments a WHERE ${where}`,
      params
    );
    return NextResponse.json({ count: parseInt(rows[0].cnt, 10) });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
