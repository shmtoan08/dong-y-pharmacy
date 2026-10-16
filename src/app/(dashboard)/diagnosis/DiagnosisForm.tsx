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

export function DiagnosisForm({ symptoms }: { symptoms: SymptomOption[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pulse, setPulse] = useState<PulseSelection>({});
  const [results, setResults] = useState<DiagnosisResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const pulseSymptoms = symptoms.filter((s) => s.category === "Mạch");
  const allSelected = [...new Set([...selected, ...Object.values(pulse)])];

  const run = async () => {
    if (allSelected.length === 0) return;
    setLoading(true);
    try {
      setResults(await diagnoseCases(allSelected));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Triệu chứng người bệnh</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SymptomPicker symptoms={symptoms} selected={selected} onChange={setSelected} />
          <Button onClick={run} disabled={allSelected.length === 0 || loading} className="bg-emerald-800 hover:bg-emerald-900">
            {loading ? "Đang tìm..." : `Tìm bệnh án (${allSelected.length} triệu chứng)`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mạch tượng</CardTitle>
        </CardHeader>
        <CardContent>
          <PulseExam pulseSymptoms={pulseSymptoms} selected={pulse} onChange={setPulse} />
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            Kết quả gợi ý ({results.length})
          </h2>
          {results.length === 0 && (
            <p className="text-sm text-stone-500">
              Không tìm thấy bệnh án nào khớp với các triệu chứng đã chọn.
            </p>
          )}
          {results.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/clinical-cases/${r.id}`}
                      className="font-semibold text-stone-900 hover:text-emerald-700 hover:underline"
                    >
                      {r.disease_name}
                    </Link>
                    <p className="text-sm text-stone-600">Biện chứng: {r.pattern}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 border-emerald-300 text-emerald-700">
                    Khớp {r.matched}/{r.total} triệu chứng
                  </Badge>
                </div>
                {r.treatment_principle && (
                  <p className="text-sm text-stone-600">Pháp trị: {r.treatment_principle}</p>
                )}
                {r.template_name && (
                  <p className="text-sm text-stone-600">Bài thuốc: {r.template_name}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {r.matched_symptoms.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
