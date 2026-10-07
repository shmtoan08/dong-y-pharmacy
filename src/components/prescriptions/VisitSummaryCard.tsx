import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface VisitSummary {
  full_name: string;
  patient_code: string;
  sex: string | null;
  date_of_birth: string | null;
  allergies: string | null;
  medical_history: string | null;
  visited_at: string;
  final_diagnosis: string | null;
  doctor_notes: string | null;
  pulse_summary: string | null;
}

const SEX_LABEL: Record<string, string> = { male: "Nam", female: "Nữ", other: "Khác" };

export function VisitSummaryCard({ visit }: { visit: VisitSummary }) {
  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Thông tin khám</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="font-medium text-stone-900">
            {visit.full_name}
            <span className="ml-2 font-mono text-xs text-stone-500">{visit.patient_code}</span>
          </p>
          <p className="text-xs text-stone-500">
            {[visit.sex ? SEX_LABEL[visit.sex] : null,
              visit.date_of_birth
                ? new Date(visit.date_of_birth).toLocaleDateString("vi-VN")
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        {visit.allergies && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs font-medium text-red-700">Dị ứng</p>
            <p className="text-sm text-red-900">{visit.allergies}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-stone-500">Ngày khám</p>
          <p className="text-stone-900">
            {new Date(visit.visited_at).toLocaleString("vi-VN")}
          </p>
        </div>

        {visit.final_diagnosis && (
          <div>
            <p className="text-xs font-medium text-stone-500">Chẩn đoán</p>
            <p className="text-stone-900">{visit.final_diagnosis}</p>
          </div>
        )}

        {visit.pulse_summary && (
          <div>
            <p className="text-xs font-medium text-stone-500">Mạch</p>
            <p className="text-stone-900">{visit.pulse_summary}</p>
          </div>
        )}

        {visit.doctor_notes && (
          <div>
            <p className="text-xs font-medium text-stone-500">Ghi chú khám</p>
            <p className="text-stone-900">{visit.doctor_notes}</p>
          </div>
        )}

        {visit.medical_history && (
          <div>
            <p className="text-xs font-medium text-stone-500">Tiền sử</p>
            <p className="text-stone-900">{visit.medical_history}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
