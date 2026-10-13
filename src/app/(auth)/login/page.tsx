import { getPublicClinicBranding } from "@/features/admin/settings";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const { clinicName, clinicLogoUrl } = await getPublicClinicBranding();
  return <LoginForm clinicName={clinicName} clinicLogoUrl={clinicLogoUrl} />;
}
