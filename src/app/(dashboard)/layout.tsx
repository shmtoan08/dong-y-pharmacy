import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { getUserPermissions } from "@/lib/getUserPermissions";
import { getClinicBranding } from "@/features/admin/settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const permissions = await getUserPermissions();
  const branding = await getClinicBranding();

  return (
    <AppShell
      user={user}
      permissions={permissions}
      clinicName={branding.clinic_name}
      clinicLogoUrl={branding.clinic_logo_url}
    >
      {children}
    </AppShell>
  );
}
