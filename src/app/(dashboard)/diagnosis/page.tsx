import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getAllSymptoms } from "@/features/clinical-cases/queries";
import { DiagnosisForm } from "./DiagnosisForm";
import { Stethoscope, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Hỗ trợ chẩn đoán",
};

export default async function DiagnosisPage() {
  await requireRole("admin", "practitioner", "dispenser");
  const symptoms = await getAllSymptoms();

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Header trang */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-xl font-bold text-stone-900 md:text-2xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-xs">
              <Stethoscope className="h-5 w-5" />
            </span>
            Hỗ Trợ Chẩn Đoán &amp; Biện Chứng
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Đối chiếu Tứ chẩn (Vọng, Văn, Vấn, Thiết) để gợi ý các bệnh án kinh nghiệm, biện chứng và bài thuốc phù hợp.
          </p>
        </div>
      </div>

      {/* Cảnh báo y tế bắt buộc theo NFR-6 & US-3.7 */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 shadow-2xs">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="leading-relaxed">
          <span className="font-bold">Lưu ý lâm sàng:</span> Kết quả gợi ý dựa trên kho bệnh án kinh nghiệm lưu trữ và chỉ mang tính chất hỗ trợ ra quyết định. Thầy thuốc chịu trách nhiệm lâm sàng đối với chẩn đoán và đơn thuốc cuối cùng.
        </div>
      </div>

      {/* Khu vực thao tác chính */}
      <DiagnosisForm symptoms={symptoms} />
    </div>
  );
}
