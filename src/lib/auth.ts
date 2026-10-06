import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

export const SESSION_COOKIE = "dongy_session";
// 8 tiếng theo tài liệu yêu cầu
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export type Role = "admin" | "practitioner" | "dispenser";

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
}

/**
 * Hash token trước khi lưu/query DB.
 * Lý do (theo review security): nếu DB bị lộ, attacker có raw token là đăng nhập
 * được ngay không cần mật khẩu. Lưu hash thì brute-force 256-bit là bất khả thi.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Tạo session mới và set cookie. Trả về user. */
export async function createSession(userId: string): Promise<SessionUser> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const { rows } = await db.query(
    `INSERT INTO sessions (token, user_id, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [tokenHash, userId, expiresAt.toISOString()],
  );
  if (rows.length === 0) throw new Error("Không tạo được session");

  const user = await getUserById(userId);
  if (!user) throw new Error("Không tìm thấy user");

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return user;
}

/** Xóa session hiện tại (logout) — xóa trong DB, không chỉ xóa cookie. */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.query(`DELETE FROM sessions WHERE token = $1`, [
      hashToken(token),
    ]);
  }
  jar.delete(SESSION_COOKIE);
}

/** Xóa tất cả session của 1 user (dùng khi đổi mật khẩu / khóa tài khoản). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
}

/** Lấy user từ session cookie, null nếu không hợp lệ/hết hạn/bị khóa. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { rows } = await db.query(
    `SELECT u.id, u.email, u.full_name, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1
       AND s.expires_at > NOW()
       AND u.is_active = true`,
    [hashToken(token)],
  );
  if (rows.length === 0) return null;
  return rows[0] as SessionUser;
}

async function getUserById(id: string): Promise<SessionUser | null> {
  const { rows } = await db.query(
    `SELECT id, email, full_name, role FROM users WHERE id = $1 AND is_active = true`,
    [id],
  );
  return (rows[0] as SessionUser) ?? null;
}

/** Dùng trong Server Component: chưa login → về /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Dùng trong Server Component: sai role → về trang chủ. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}
