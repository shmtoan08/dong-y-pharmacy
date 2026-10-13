import { getPublicClinicBranding } from "@/features/admin/settings";
import { LoginForm } from "./LoginForm";

// Trang login cần đọc tên/logo phòng khám từ DB → không prerender lúc build
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const { clinicName, clinicLogoUrl } = await getPublicClinicBranding();
  return <LoginForm clinicName={clinicName} clinicLogoUrl={clinicLogoUrl} />;
}
