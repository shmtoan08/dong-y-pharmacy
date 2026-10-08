"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";

export interface RoleDef {
  code: string;
  label: string;
  description: string | null;
  is_system: boolean;
  staff_count: number;
}

/** Danh sách vai trò + số nhân viên */
export async function getRoles(): Promise<RoleDef[]> {
  await requireRole("admin");
  const { rows } = await db.query<RoleDef>(
    `SELECT rd.code, rd.label, rd.description, rd.is_system,
            COUNT(u.id)::int AS staff_count
     FROM role_definitions rd
     LEFT JOIN users u ON u.role = rd.code AND u.is_active = true
     GROUP BY rd.code, rd.label, rd.description, rd.is_system
     ORDER BY rd.is_system DESC, rd.label`,
  );
  return rows;
}

/** Tạo vai trò tùy chỉnh */
export async function createRole(
  code: string,
  label: string,
  description?: string,
): Promise<{ error?: string }> {
  const user = await requireRole("admin");
  const cleanCode = code.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (!cleanCode || cleanCode.length < 2) return { error: "Mã vai trò không hợp lệ." };
  if (!label.trim()) return { error: "Chưa nhập tên vai trò." };
  if (["admin", "practitioner", "dispenser"].includes(cleanCode)) {
    return { error: "Mã vai trò đã tồn tại." };
  }

  try {
    await db.query(
      `INSERT INTO role_definitions (code, label, description, is_system)
       VALUES ($1, $2, $3, false)`,
      [cleanCode, label.trim(), description?.trim() || null],
    );
  } catch {
    return { error: "Mã vai trò đã tồn tại." };
  }

  await audit({ userId: user.id, action: "ROLE_CREATE", tableName: "role_definitions", rowId: cleanCode });
  return {};
}

/** Xóa vai trò tùy chỉnh (chỉ khi không có nhân viên nào dùng) */
export async function deleteRole(code: string): Promise<{ error?: string }> {
  const user = await requireRole("admin");
  const { rows } = await db.query(
    `SELECT is_system FROM role_definitions WHERE code = $1`,
    [code],
  );
  if (rows.length === 0) return { error: "Vai trò không tồn tại." };
  if (rows[0].is_system) return { error: "Không thể xóa vai trò hệ thống." };

  const { rows: users } = await db.query(
    `SELECT COUNT(*)::int AS c FROM users WHERE role = $1 AND is_active = true`,
    [code],
  );
  if (users[0].c > 0) return { error: `Còn ${users[0].c} nhân viên đang dùng vai trò này.` };

  await db.query(`DELETE FROM role_permissions WHERE role = $1`, [code]);
  await db.query(`DELETE FROM role_definitions WHERE code = $1`, [code]);

  await audit({ userId: user.id, action: "ROLE_DELETE", tableName: "role_definitions", rowId: code });
  return {};
}
