export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { getSettings } from "@/features/admin/settings";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  await requireRole("admin");
  const settings = await getSettings();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Cài đặt chung</h1>
        <p className="text-sm text-stone-500">Thông tin phòng khám và cấu hình hệ thống.</p>
      </div>
      <SettingsForm initial={settings} />
    </div>
  );
}
