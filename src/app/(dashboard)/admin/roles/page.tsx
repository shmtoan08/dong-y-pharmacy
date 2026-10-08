export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permissions-server";
import { getRoles } from "@/features/admin/roles";
import { RolesManager } from "./RolesManager";

export default async function RolesPage() {
  await requireRole("admin");

  const roles = await getRoles();
  const initialPermissions: Record<string, Record<string, boolean>> = {};
  for (const r of roles) {
    if (r.code !== "admin") {
      initialPermissions[r.code] = await getRolePermissions(r.code);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Vai trò & Phân quyền</h1>
        <p className="text-sm text-stone-500">Thay đổi có hiệu lực ngay lập tức.</p>
      </div>
      <RolesManager roles={roles} initialPermissions={initialPermissions} />
    </div>
  );
}
