import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { countPendingBookings } from "@/features/appointments/queries";

export const dynamic = "force-dynamic";

function canManage(role: string): boolean {
  return role === "admin" || role === "practitioner";
}

// API nội bộ cho sidebar badge — không import từ file "use server"
export async function GET() {
  try {
    const user = await requireUser();
    if (!canManage(user.role)) return NextResponse.json({ count: 0 });

    const count = await countPendingBookings(user.role, user.id);
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
