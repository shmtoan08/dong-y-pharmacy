import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Route test tối giản: kiểm tra kết nối DB qua Hyperdrive
// Không dùng auth, không dùng "use server", chỉ test pg + Hyperdrive
export async function GET() {
  const steps: string[] = [];
  try {
    steps.push("1. import getCloudflareContext");
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    steps.push("2. get env");
    const env = getCloudflareContext().env as Record<string, unknown>;
    const hd = env?.HYPERDRIVE as { connectionString?: string } | undefined;
    steps.push(`3. hyperdrive binding: ${hd ? "có" : "KHÔNG"}`);
    const cs = hd?.connectionString;
    steps.push(`4. connectionString: ${cs ? `có (${cs.length} ký tự, prefix: ${cs.slice(0, 20)}...)` : "KHÔNG"}`);

    steps.push("5. import pg Pool");
    const { Pool } = await import("pg");
    steps.push("6. tạo Pool");
    const pool = new Pool({ connectionString: cs, max: 2 });
    steps.push("7. query SELECT 1");
    const r = await pool.query("SELECT 1 as one");
    steps.push(`8. kết quả: ${JSON.stringify(r.rows)}`);
    await pool.end();
    steps.push("9. đóng pool OK");
    return NextResponse.json({ ok: true, steps });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json(
      { ok: false, steps, error: err?.message, stack: err?.stack?.slice(0, 2000) },
      { status: 500 }
    );
  }
}
