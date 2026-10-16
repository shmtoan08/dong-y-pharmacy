"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SymptomPicker } from "../clinical-cases/SymptomPicker";
import { PulseExam, type PulseSelection } from "./PulseExam";
import {
  diagnoseCases,
  type DiagnosisResult,
  type SymptomOption,
} from "@/features/clinical-cases/actions";
import {
  Search,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ClipboardList,
  Activity,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function DiagnosisForm({ symptoms }: { symptoms: SymptomOption[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pulse, setPulse] = useState<PulseSelection>({});
  const [results, setResults] = useState<DiagnosisResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const pulseSymptoms = symptoms.filter((s) => s.category === "Mạch");
  const pulseValues = Object.values(pulse);
  const allSelected = [...new Set([...selected, ...pulseValues])];

  const handleResetAll = () => {
    setSelected([]);
    setPulse({});
    setResults(null);
  };

  const run = async () => {
    if (allSelected.length === 0) return;
    setLoading(true);
    try {
      const res = await diagnoseCases(allSelected);
      setResults(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
      {/* ================= CỘT TRÁI: TỨ CHẨN & BẮT MẠCH (5/12 hoặc 6/12) ================= */}
      <div className="space-y-4 lg:col-span-6 xl:col-span-5">
        {/* Card 1: Triệu chứng lâm sàng */}
        <Card className="border-stone-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-stone-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-emerald-800" />
                Triệu chứng người bệnh (Vọng · Văn · Vấn)
              </CardTitle>
              {selected.length > 0 && (
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {selected.length} dấu hiệu
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <SymptomPicker
              symptoms={symptoms}
              selected={selected}
              onChange={setSelected}
              hideCategories={["Mạch"]}
            />
          </CardContent>
        </Card>

        {/* Card 2: Bắt mạch 6 bộ vị */}
        <Card className="border-stone-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-stone-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-800" />
                Mạch tượng (Thiết chẩn 6 bộ vị)
              </CardTitle>
              {pulseValues.length > 0 && (
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {pulseValues.length} vị trí
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <PulseExam
              pulseSymptoms={pulseSymptoms}
              selected={pulse}
              onChange={setPulse}
            />
          </CardContent>
        </Card>

        {/* Thanh Action Bar điều khiển */}
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white/95 p-3.5 shadow-md backdrop-blur-md">
          <div className="text-xs text-stone-600">
            Tổng ghi nhận:{" "}
            <span className="font-bold text-emerald-800 text-sm">
              {allSelected.length}
            </span>{" "}
            chỉ dấu lâm sàng
          </div>
          <div className="flex items-center gap-2">
            {allSelected.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetAll}
                className="text-stone-500 hover:text-stone-900 text-xs h-8"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Làm mới
              </Button>
            )}
            <Button
              type="button"
              onClick={run}
              disabled={allSelected.length === 0 || loading}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs h-9 px-4 shadow-xs"
            >
              {loading ? (
                <>Đang đối chiếu...</>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5 mr-1.5" />
                  Biện chứng & Tìm bệnh án
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ================= CỘT PHẢI: KẾT QUẢ GỢI Ý & PHÁP TRỊ (7/12 hoặc 6/12) ================= */}
      <div className="space-y-4 lg:col-span-6 xl:col-span-7">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            Biện chứng & Bệnh án gợi ý
            {results && (
              <span className="ml-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 normal-case tracking-normal">
                {results.length} ca bệnh khớp
              </span>
            )}
          </h2>
        </div>

        {/* Trạng thái 1: Chưa bấm tìm */}
        {!results && !loading && (
          <Card className="border-dashed border-stone-200 bg-stone-50/60 p-8 text-center text-stone-500 rounded-xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-800">
              Sẵn sàng đối chiếu lâm sàng
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-stone-500">
              Hãy chọn các triệu chứng từ Vọng, Văn, Vấn chẩn và kết quả bắt mạch
              ở cột bên trái, sau đó bấm &quot;Biện chứng &amp; Tìm bệnh án&quot; để tra cứu.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-left max-w-md mx-auto pt-2 border-t border-stone-200/60 text-[11px] text-stone-600">
              <div className="bg-white p-2 rounded border border-stone-200">
                <span className="font-semibold text-emerald-800 block">1. Thu thập</span>
                Tích chọn triệu chứng nổi bật của người bệnh.
              </div>
              <div className="bg-white p-2 rounded border border-stone-200">
                <span className="font-semibold text-emerald-800 block">2. Bắt mạch</span>
                Ghi nhận 6 bộ thốn quan xích 2 tay.
              </div>
              <div className="bg-white p-2 rounded border border-stone-200">
                <span className="font-semibold text-emerald-800 block">3. Biện chứng</span>
                Xem gợi ý thể bệnh, pháp trị &amp; bài thuốc.
              </div>
            </div>
          </Card>
        )}

        {/* Trạng thái 2: Đang tải */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse border-stone-200 p-5 space-y-3">
                <div className="h-5 w-1/3 bg-stone-200 rounded" />
                <div className="h-4 w-1/2 bg-stone-100 rounded" />
                <div className="h-16 w-full bg-stone-100 rounded" />
              </Card>
            ))}
          </div>
        )}

        {/* Trạng thái 3: Đã tìm nhưng không thấy ca nào */}
        {results && results.length === 0 && !loading && (
          <Card className="border-stone-200 bg-white p-8 text-center text-stone-500 rounded-xl">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <Search className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-stone-800">
              Không tìm thấy bệnh án kinh nghiệm khớp
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-stone-500">
              Chưa có ca bệnh lưu trữ nào khớp với tập hợp các triệu chứng và mạch
              tượng đã chọn. Thầy thuốc có thể thử bỏ bớt một vài dấu hiệu phụ hoặc kiểm tra lại mạch.
            </p>
          </Card>
        )}

        {/* Trạng thái 4: Hiển thị danh sách kết quả */}
        {results && results.length > 0 && !loading && (
          <div className="space-y-3.5">
            {results.map((r) => {
              const matchPercent = Math.round((r.matched / r.total) * 100);
              const isHighMatch = matchPercent >= 70;

              return (
                <Card
                  key={r.id}
                  className="border-stone-200 bg-white hover:border-emerald-300 transition-all shadow-xs hover:shadow-sm rounded-xl overflow-hidden"
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Header ca bệnh: Tên bệnh & Điểm tương đồng */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/clinical-cases/${r.id}`}
                          className="text-base font-bold text-stone-900 hover:text-emerald-800 hover:underline flex items-center gap-1.5"
                        >
                          {r.disease_name}
                          <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
                        </Link>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-stone-500 font-medium">
                            Biện chứng:
                          </span>
                          <span className="text-xs font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
                            {r.pattern}
                          </span>
                        </div>
                      </div>

                      {/* Badge tỷ lệ khớp */}
                      <div className="text-right shrink-0">
                        <Badge
                          className={cn(
                            "text-xs font-semibold px-2 py-0.5",
                            isHighMatch
                              ? "bg-emerald-800 text-white"
                              : "bg-amber-600 text-white"
                          )}
                        >
                          Khớp {r.matched}/{r.total} dấu hiệu ({matchPercent}%)
                        </Badge>
                      </div>
                    </div>

                    {/* Thanh đo mức độ tương đồng (Match Progress Bar) */}
                    <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          isHighMatch ? "bg-emerald-600" : "bg-amber-500"
                        )}
                        style={{ width: `${Math.min(matchPercent, 100)}%` }}
                      />
                    </div>

                    {/* Khối Pháp trị & Bài thuốc gợi ý */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg bg-stone-50/80 p-2.5 text-xs border border-stone-100">
                      <div>
                        <span className="text-stone-400 block text-[11px] font-medium uppercase tracking-wider mb-0.5">
                          Pháp trị
                        </span>
                        <span className="font-semibold text-stone-800">
                          {r.treatment_principle || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[11px] font-medium uppercase tracking-wider mb-0.5">
                          Bài thuốc kinh nghiệm
                        </span>
                        <span className="font-semibold text-emerald-800 flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                          {r.template_name || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Danh sách các triệu chứng đã khớp */}
                    <div className="space-y-1.5 pt-0.5">
                      <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
                        Dấu hiệu phù hợp ({r.matched_symptoms.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {r.matched_symptoms.map((s) => (
                          <Badge
                            key={s}
                            variant="outline"
                            className="text-xs bg-emerald-50/60 text-emerald-900 border-emerald-200 font-normal py-0.5 px-2 flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Nút hành động */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                      <Link href={`/clinical-cases/${r.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-stone-700 hover:text-stone-900 border-stone-200"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Xem bệnh án
                        </Button>
                      </Link>
                      {r.template_id && (
                        <Link href={`/formulas/${r.template_id}`}>
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-emerald-800 hover:bg-emerald-900 text-white font-medium"
                          >
                            <BookOpen className="h-3.5 w-3.5 mr-1" />
                            Xem bài thuốc
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
