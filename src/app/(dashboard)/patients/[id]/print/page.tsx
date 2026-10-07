import { getPatient } from "@/features/patients/actions";
import { getVisitsByPatient, getVisitDetail } from "@/features/visits/actions";
import { getPrescriptionsByVisit } from "@/features/prescriptions/actions";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/shared/BackButton";

const SEX_LABEL: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

/** In bệnh án khổ A4 */
export default async function PrintPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  const visits = await getVisitsByPatient(id);
  const details = await Promise.all(visits.map((v) => getVisitDetail(v.id)));
  const prescriptionsByVisit = await Promise.all(
    visits.map(async (v) => ({
      visit: v,
      prescriptions: await getPrescriptionsByVisit(v.id),
    })),
  );

  const dob = patient.date_of_birth
    ? new Date(patient.date_of_birth).toLocaleDateString("vi-VN")
    : "—";

  return (
    <div className="min-h-screen bg-white">
      <div className="no-print flex items-center justify-center gap-4 p-4 print:hidden">
        <BackButton href={`/patients/${id}`} />
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-emerald-800 px-6 py-2 text-white hover:bg-emerald-900"
        >
          In bệnh án
        </button>
      </div>

      <div className="mx-auto max-w-3xl p-8 text-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold">ĐÔNG Y ĐƯỜNG</h1>
          <p className="text-stone-600">Phòng khám Y học cổ truyền</p>
          <h2 className="mt-4 text-lg font-bold underline underline-offset-4">
            BỆNH ÁN
          </h2>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 border-y border-stone-300 py-3">
          <p><span className="font-semibold">Họ tên:</span> {patient.full_name}</p>
          <p><span className="font-semibold">Mã BN:</span> {patient.patient_code}</p>
          <p><span className="font-semibold">Ngày sinh:</span> {dob}</p>
          <p><span className="font-semibold">Giới tính:</span> {patient.sex ? SEX_LABEL[patient.sex] ?? patient.sex : "—"}</p>
          <p><span className="font-semibold">SĐT:</span> {patient.phone ?? "—"}</p>
          <p><span className="font-semibold">Địa chỉ:</span> {patient.address ?? "—"}</p>
          {patient.medical_history && (
            <p className="col-span-2"><span className="font-semibold">Tiền sử:</span> {patient.medical_history}</p>
          )}
          {patient.allergies && (
            <p className="col-span-2"><span className="font-semibold">Dị ứng:</span> {patient.allergies}</p>
          )}
        </div>

        <h3 className="mb-2 font-bold">QUÁ TRÌNH THĂM KHÁM ({visits.length})</h3>
        {details.map((d, idx) => {
          if (!d) return null;
          const prs = prescriptionsByVisit[idx]?.prescriptions ?? [];
          return (
            <div key={d.id} className="mb-4 break-inside-avoid border border-stone-200 p-3">
              <p className="font-semibold">
                Lần {visits.length - idx}:{" "}
                {new Date(d.visited_at).toLocaleDateString("vi-VN", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
                <span className="ml-2 font-normal text-stone-500">{d.practitioner_name}</span>
              </p>
              {d.inspection_notes && <p className="mt-1"><span className="font-medium">Vọng:</span> {d.inspection_notes}</p>}
              {d.auscultation_notes && <p><span className="font-medium">Văn:</span> {d.auscultation_notes}</p>}
              {d.inquiry_notes && <p><span className="font-medium">Vấn:</span> {d.inquiry_notes}</p>}
              {d.palpation_notes && <p><span className="font-medium">Thiết:</span> {d.palpation_notes}</p>}
              {d.pulses.length > 0 && (
                <p className="mt-1">
                  <span className="font-medium">Mạch:</span>{" "}
                  {d.pulses.map((p) => `${p.hand === "left" ? "T" : "P"}-${p.position}: ${p.pattern_name ?? p.custom_note ?? ""}`).join("; ")}
                </p>
              )}
              {d.final_diagnosis && <p className="mt-1"><span className="font-medium">Chẩn đoán:</span> {d.final_diagnosis}</p>}
              {d.bat_cuong && <p><span className="font-medium">Bát cương:</span> {d.bat_cuong}</p>}
              {prs.length > 0 && (
                <p className="mt-1"><span className="font-medium">Đơn thuốc:</span> {prs.map((pr) => `${pr.prescription_code} (${pr.num_of_packs} thang)`).join(", ")}</p>
              )}
            </div>
          );
        })}

        <div className="mt-8 flex justify-between text-center">
          <div>
            <p className="font-semibold">Bệnh nhân</p>
            <p className="mt-12 text-xs text-stone-500">(Ký, ghi rõ họ tên)</p>
          </div>
          <div>
            <p className="font-semibold">Thầy thuốc</p>
            <p className="mt-12 text-xs text-stone-500">(Ký, ghi rõ họ tên)</p>
          </div>
        </div>
      </div>

      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  );
}
