import { NextResponse } from "next/server";
import { countPendingBookings } from "@/features/appointments/online";

export const dynamic = "force-dynamic";

// API nội bộ cho sidebar badge
export async function GET() {
  try {
    const count = await countPendingBookings();
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
