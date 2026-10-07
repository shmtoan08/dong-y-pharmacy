import { BackButton } from "@/components/shared/BackButton";
import { createPatient } from "@/features/patients/actions";
import { PatientForm } from "../PatientForm";

export default function NewPatientPage() {
  return (
    <div className="space-y-4">
      <BackButton href="/patients" />
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
          Thêm bệnh nhân
        </h1>
        <p className="text-sm text-stone-500">
          Mã bệnh nhân sẽ được sinh tự động
        </p>
      </div>
      <PatientForm action={createPatient} submitLabel="Lưu bệnh nhân" />
    </div>
  );
}
