export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permissions-server";
import { RolesMatrix } from "./RolesMatrix";

export default async function RolesPage() {
  await requireRole("admin");

  const initial: Record<string, Record<string, boolean>> = {
    practitioner: await getRolePermissions("practitioner"),
    dispenser: await getRolePermissions("dispenser"),
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Phân quyền</h1>
        <p className="text-sm text-stone-500">Bật/tắt quyền truy cập theo vai trò. Thay đổi có hiệu lực ngay.</p>
      </div>
      <RolesMatrix initial={initial} />
    </div>
  );
}
