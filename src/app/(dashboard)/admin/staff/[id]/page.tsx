import { BackButton } from "@/components/shared/BackButton";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getStaffById } from "@/features/users/queries";
import { EditStaffForm } from "./EditStaffForm";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;

  const user = await getStaffById(id);
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <BackButton href="/admin/staff" />
      <h1 className="text-2xl font-bold">Sửa nhân viên</h1>
      <EditStaffForm user={user} />
    </div>
  );
}
