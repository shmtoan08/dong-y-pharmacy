import { getSessionUser } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permissions-server";
import { PERMISSIONS } from "@/lib/permissions";

export async function getUserPermissions(): Promise<string[]> {
  const user = await getSessionUser();
  if (!user) return [];
  if (user.role === "admin") {
    return PERMISSIONS.map((p) => p.key);
  }
  const perms = await getRolePermissions(user.role);
  return Object.entries(perms)
    .filter(([, v]) => v)
    .map(([k]) => k);
}
