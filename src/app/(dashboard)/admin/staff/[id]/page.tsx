import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { EditStaffForm } from "./EditStaffForm";

interface StaffRow {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
}

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;

  const { rows } = await db.query(
    "SELECT id, email, full_name, phone, role FROM users WHERE id = $1",
    [id],
  );
  const user = rows[0] as unknown as StaffRow | undefined;
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Sửa nhân viên</h1>
      <EditStaffForm user={user} />
    </div>
  );
}
