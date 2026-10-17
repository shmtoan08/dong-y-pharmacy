import { BackButton } from "@/components/shared/BackButton";
import { updatePatient } from "@/features/patients/actions";
import { getPatient } from "@/features/patients/queries";
import { PatientForm } from "../../PatientForm";
import { notFound } from "next/navigation";

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  const bound = updatePatient.bind(null, id);

  // Chuyển null → undefined cho form
  const initial = {
    full_name: patient.full_name,
    date_of_birth: patient.date_of_birth ?? undefined,
    sex: (patient.sex as "male" | "female" | "other" | null) ?? undefined,
    phone: patient.phone ?? undefined,
    address: patient.address ?? undefined,
    medical_history: patient.medical_history ?? undefined,
    allergies: patient.allergies ?? undefined,
  };

  return (
    <div className="space-y-4">
      <BackButton href={`/patients/${id}`} />
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
          Sửa thông tin — {patient.full_name}
        </h1>
        <p className="text-sm text-stone-500">{patient.patient_code}</p>
      </div>
      <PatientForm action={bound} initial={initial} submitLabel="Lưu thay đổi" />
    </div>
  );
}
