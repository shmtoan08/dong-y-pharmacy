import { getPrescriptionSnapshot, getPrescription } from "@/features/prescriptions/queries";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/shared/BackButton";
import { PrintButton } from "@/components/shared/PrintButton";

/**
 * In đơn thuốc khổ A5 — đọc DUY NHẤT từ snapshot (bất biến lúc CONFIRM).
 */
export default async function PrintPrescriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Thu snapshot truoc (don da duyet), neu khong co thi dung du lieu draft
  const snapshot = await getPrescriptionSnapshot(id);
  let snap;
  if (snapshot) {
    snap = snapshot;
  } else {
    // Don nhap: lay du lieu hien tai
    const draft = await getPrescription(id);
    if (!draft) notFound();
    snap = {
      prescriptionCode: draft.prescription_code,
      visitDate: draft.created_at,
      confirmedAt: draft.confirmed_at ?? new Date().toISOString(),
      patient: {
        name: draft.patient_name,
        code: draft.patient_code,
        dob: null,
        phone: null,
      },
      numOfPacks: draft.num_of_packs,
      items: draft.items.map((it) => ({
        herbName: it.herb_name,
        weightPerPack: Number(it.weight_per_pack),
        totalWeight: Number(it.weight_per_pack) * draft.num_of_packs,
        note: it.note,
      })),
      totalWeightAll: draft.items.reduce((s, it) => s + (Number(it.weight_per_pack) * draft.num_of_packs), 0),
      usageInstruction: draft.usage_instruction,
      doctorNotes: draft.doctor_notes,
      confirmedBy: { name: draft.practitioner_name ?? "" },
      isDraft: true,
    };
  }

  const visitDate = new Date(snap.visitDate).toLocaleDateString("vi-VN");
  const confirmedDate = new Date(snap.confirmedAt).toLocaleDateString("vi-VN");
  const dob = snap.patient.dob
    ? new Date(snap.patient.dob).toLocaleDateString("vi-VN")
    : "—";

  return (
    <div className="min-h-screen bg-white">
      {/* Nút quay lại + in — ẩn khi in */}
      <div className="no-print flex items-center justify-center gap-4 p-4">
        <BackButton href={`/prescriptions/${id}`} />
        <PrintButton label="In đơn thuốc" />
      </div>

      <div className="print-page mx-auto max-w-[148mm] bg-white p-6 text-stone-900">
        {/* Header phòng thuốc */}
        <div className="border-b-2 border-emerald-800 pb-3 text-center">
          <h1 className="text-xl font-bold tracking-wide">ĐÔNG Y ĐƯỜNG</h1>
          <p className="text-sm text-stone-600">Phòng thuốc Đông y</p>
          <h2 className="mt-2 text-lg font-bold">ĐƠN THUỐC</h2>
          <p className="text-sm">Mã đơn: {snap.prescriptionCode}</p>
        </div>

        {/* Thông tin BN */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 py-3 text-sm">
          <p><span className="font-medium">Bệnh nhân:</span> {snap.patient.name}</p>
          <p><span className="font-medium">Mã BN:</span> {snap.patient.code}</p>
          <p><span className="font-medium">Ngày sinh:</span> {dob}</p>
          <p><span className="font-medium">SĐT:</span> {snap.patient.phone ?? "—"}</p>
          <p><span className="font-medium">Ngày khám:</span> {visitDate}</p>
          <p><span className="font-medium">Số thang:</span> {snap.numOfPacks}</p>
        </div>

        {/* Bảng vị thuốc */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-stone-300 bg-stone-50">
              <th className="py-1.5 text-left">#</th>
              <th className="py-1.5 text-left">Vị thuốc</th>
              <th className="py-1.5 text-right">Liều/thang (g)</th>
              <th className="py-1.5 text-right">Tổng (g)</th>
            </tr>
          </thead>
          <tbody>
            {snap.items.map((it, i) => (
              <tr key={i} className="border-b border-stone-200">
                <td className="py-1.5">{i + 1}</td>
                <td className="py-1.5 font-medium">{it.herbName}</td>
                <td className="py-1.5 text-right">{it.weightPerPack.toFixed(1)}</td>
                <td className="py-1.5 text-right">{it.totalWeight.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={3} className="py-1.5 text-right">Tổng cộng:</td>
              <td className="py-1.5 text-right">{snap.totalWeightAll.toFixed(1)} g</td>
            </tr>
          </tfoot>
        </table>

        {snap.usageInstruction && (
          <p className="mt-3 text-sm">
            <span className="font-medium">Cách dùng:</span> {snap.usageInstruction}
          </p>
        )}
        {snap.doctorNotes && (
          <p className="mt-1 text-sm">
            <span className="font-medium">Ghi chú:</span> {snap.doctorNotes}
          </p>
        )}

        {/* Chữ ký */}
        <div className="mt-6 flex justify-end text-sm">
          <div className="text-center">
            <p>Ngày {confirmedDate}</p>
            <p className="font-medium">Thầy thuốc</p>
            <div className="h-16" />
            <p className="font-semibold">{snap.confirmedBy.name}</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A5; margin: 10mm; }
          .print-page { max-width: none; padding: 0; }
        }
      `}</style>
    </div>
  );
}
