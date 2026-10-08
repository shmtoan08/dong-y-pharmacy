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

/** Lấy tất cả quyền của 1 role (cho UI ma trận) */
export async function getRolePermissions(role: string): Promise<Record<string, boolean>> {
  const { PERMISSIONS } = await import("./permissions");
  const result: Record<string, boolean> = {};
  for (const p of PERMISSIONS) {
    result[p.key] = await hasPermission(role, p.key);
  }
  return result;
}
