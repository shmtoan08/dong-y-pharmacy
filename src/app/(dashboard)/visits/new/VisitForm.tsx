"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PulseInputForm } from "@/components/visits/PulseInputForm";
import {
  createVisit,
  type PulsePattern,
  type ActionState,
} from "@/features/visits/actions";

export function VisitForm({
  patientId,
  patientName,
  patterns,
}: {
  patientId: string;
  patientName: string;
  patterns: PulsePattern[];
}) {
  const [state, formAction] = useActionState(createVisit, {} as ActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="patient_id" value={patientId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Lượt khám — {patientName}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="inspection_notes">Vọng (nhìn)</Label>
            <Textarea id="inspection_notes" name="inspection_notes" rows={3} placeholder="Sắc mặt, lưỡi, hình thái..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auscultation_notes">Văn (nghe, ngửi)</Label>
            <Textarea id="auscultation_notes" name="auscultation_notes" rows={3} placeholder="Tiếng nói, hơi thở, mùi..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inquiry_notes">Vấn (hỏi)</Label>
            <Textarea id="inquiry_notes" name="inquiry_notes" rows={3} placeholder="Triệu chứng, diễn biến..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="palpation_notes">Thiết (sờ nắn)</Label>
            <Textarea id="palpation_notes" name="palpation_notes" rows={3} placeholder="Bụng, huyệt vị..." />
          </div>
        </CardContent>
      </Card>

      <PulseInputForm patterns={patterns} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chẩn đoán</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="final_diagnosis">Chẩn đoán cuối</Label>
            <Textarea id="final_diagnosis" name="final_diagnosis" rows={2} placeholder="VD: Can uất tỳ hư, đàm thấp..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor_notes">Ghi chú của thầy thuốc</Label>
            <Textarea id="doctor_notes" name="doctor_notes" rows={2} />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="text-sm font-medium text-red-600">{state.error}</p>
      )}

      <Button type="submit" className="bg-emerald-800 hover:bg-emerald-900">
        Lưu lượt khám
      </Button>
    </form>
  );
}
