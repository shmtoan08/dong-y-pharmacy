import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { getUserPermissions } from "@/lib/getUserPermissions";
import { getSettings } from "@/features/admin/settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const permissions = await getUserPermissions();
  const settings = await getSettings();

  return (
    <AppShell
      user={user}
      permissions={permissions}
      clinicName={settings.clinic_name}
      clinicLogoUrl={settings.clinic_logo_url}
    >
      {children}
    </AppShell>
  );
}
