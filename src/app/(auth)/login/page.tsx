import { getSettings } from "@/features/admin/settings";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const settings = await getSettings();
  return (
    <LoginForm
      clinicName={settings.clinic_name}
      clinicLogoUrl={settings.clinic_logo_url}
    />
  );
}
