import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { getUserPermissions } from "@/lib/getUserPermissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const permissions = await getUserPermissions();

  return <AppShell user={user} permissions={permissions}>{children}</AppShell>;
}
