"use server";

import { db } from "@/lib/db";
import { getSessionUser } from "./auth";
import { DEFAULT_PERMISSIONS, type PermissionKey } from "./permissions";

/** Kiểm tra quyền — admin luôn có mọi quyền, query trực tiếp từ DB */
export async function hasPermission(role: string, key: PermissionKey): Promise<boolean> {
  if (role === "admin") return true;
  const { rows } = await db.query(
    `SELECT granted FROM role_permissions WHERE role = $1 AND permission = $2`,
    [role, key],
  );
  if (rows.length === 0) {
    // Chưa cấu hình → dùng quyền mặc định (nếu có)
    return (DEFAULT_PERMISSIONS[role] ?? []).includes(key);
  }
  return rows[0].granted;
}

/** Dùng trong Server Component/Action: không có quyền → redirect về trang chủ */
export async function requirePermission(key: PermissionKey) {
  const { redirect } = await import("next/navigation");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const u = user!;
  if (!(await hasPermission(u.role, key))) redirect("/");
  return u;
}

/**
 * Lấy tất cả quyền của 1 role (cho UI ma trận) — GỘP thành 1 query duy nhất.
 * Bản cũ loop 29 query NỐI TIẾP (mỗi query = 1 pg.Client mới + TLS connect qua
 * Hyperdrive). Layout dashboard gọi hàm này MỖI request → user không phải admin
 * làm Worker vượt giới hạn tài nguyên (Error 1102) trên mọi trang sau đăng nhập.
 */
export async function getRolePermissions(role: string): Promise<Record<string, boolean>> {
  const { PERMISSIONS } = await import("./permissions");
  if (role === "admin") {
    return Object.fromEntries(PERMISSIONS.map((p) => [p.key, true]));
  }
  const { rows } = await db.query<{ permission: string; granted: boolean }>(
    `SELECT permission, granted FROM role_permissions WHERE role = $1`,
    [role],
  );
  const granted = new Map(rows.map((r) => [r.permission, r.granted]));
  const defaults = DEFAULT_PERMISSIONS[role] ?? [];
  const result: Record<string, boolean> = {};
  for (const p of PERMISSIONS) {
    // Chưa cấu hình trong DB → dùng quyền mặc định (giữ nguyên semantics của hasPermission)
    result[p.key] = granted.has(p.key) ? (granted.get(p.key) as boolean) : defaults.includes(p.key);
  }
  return result;
}
