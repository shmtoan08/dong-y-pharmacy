"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";

export async function updateRolePermissions(
  role: string,
  grants: Record<string, boolean>,
): Promise<{ error?: string }> {
  const user = await requireRole("admin");
  if (role === "admin") return { error: "Không thể sửa quyền của admin." };

  for (const p of PERMISSIONS) {
    const granted = grants[p.key] ?? false;
    await db.query(
      `INSERT INTO role_permissions (role, permission, granted)
       VALUES ($1, $2, $3)
       ON CONFLICT (role, permission) DO UPDATE SET granted = $3`,
      [role, p.key, granted],
    );
  }

  await audit({ userId: user.id, action: "ROLE_PERMISSIONS_UPDATE", tableName: "role_permissions", rowId: role });
  return {};
}
