import "server-only";
import { headers } from "next/headers";
import { db } from "./db";

// Giới hạn: 5 lần sai / 15 phút cho mỗi cặp (IP + email) → khóa 15 phút
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

function attemptKey(ip: string, email: string): string {
  return `${ip}:${email.toLowerCase().trim()}`;
}

export interface RateLimitResult {
  allowed: boolean;
  /** true nếu đang bị khóa do vượt quá giới hạn */
  blocked: boolean;
}

/** Kiểm tra có được phép thử login không. */
export async function checkLoginRateLimit(email: string): Promise<RateLimitResult> {
  const ip = await getClientIp();
  const key = attemptKey(ip, email);

  const { rows } = await db.query(
    `SELECT attempt_count, window_started_at, blocked_until
     FROM login_attempts WHERE attempt_key = $1`,
    [key],
  );

  if (rows.length === 0) return { allowed: true, blocked: false };

  const row = rows[0];
  const now = new Date();

  // Đang bị khóa
  if (row.blocked_until && new Date(row.blocked_until) > now) {
    return { allowed: false, blocked: true };
  }

  // Hết window → reset
  const windowStart = new Date(row.window_started_at);
  if (now.getTime() - windowStart.getTime() > WINDOW_MS) {
    await db.query(`DELETE FROM login_attempts WHERE attempt_key = $1`, [key]);
    return { allowed: true, blocked: false };
  }

  if (row.attempt_count >= MAX_ATTEMPTS) {
    await db.query(
      `UPDATE login_attempts SET blocked_until = NOW() + make_interval(secs => $2)
       WHERE attempt_key = $1`,
      [key, BLOCK_MS / 1000],
    );
    return { allowed: false, blocked: true };
  }

  return { allowed: true, blocked: false };
}

/** Ghi nhận 1 lần login thất bại. */
export async function recordFailedLogin(email: string): Promise<void> {
  const ip = await getClientIp();
  const key = attemptKey(ip, email);

  await db.query(
    `INSERT INTO login_attempts (attempt_key, attempt_count, window_started_at)
     VALUES ($1, 1, NOW())
     ON CONFLICT (attempt_key)
     DO UPDATE SET attempt_count = login_attempts.attempt_count + 1`,
    [key],
  );
}

/** Xóa record khi login thành công. */
export async function clearLoginAttempts(email: string): Promise<void> {
  const ip = await getClientIp();
  const key = attemptKey(ip, email);
  await db.query(`DELETE FROM login_attempts WHERE attempt_key = $1`, [key]);
}
