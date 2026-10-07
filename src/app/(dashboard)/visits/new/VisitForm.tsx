"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, User } from "lucide-react";
import { PulseInputForm } from "@/components/visits/PulseInputForm";
import { BatCuongPicker } from "./BatCuongPicker";
import {
  createVisit,
  type PulsePattern,
  type ActionState,
} from "@/features/visits/actions";
import type { PatientRow } from "@/features/patients/actions";

const SEX_LABEL: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

function calcAge(dob: string | null): string {
  if (!dob) return "—";
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? `${age} tuổi` : "—";
}

/**
 * Form khám bệnh 2 cột:
 * - Trái: quá trình thăm khám (Tứ chẩn, Bắt mạch, Chẩn đoán)
 * - Phải (sticky): tóm tắt bệnh nhân + nút hành động
 */
export function VisitForm({
  patient,
  visitCount,
  patterns,
}: {
  patient: PatientRow;
  visitCount: number;
  patterns: PulsePattern[];
}) {
  const [state, formAction, pending] = useActionState(createVisit, {} as ActionState);
  const nextActionRef = useRef<HTMLInputElement>(null);

  const submitWith = (next: "save" | "prescribe") => {
    if (nextActionRef.current) nextActionRef.current.value = next;
    // submit form thủ công để kèm next_action
    (document.getElementById("visit-form") as HTMLFormElement)?.requestSubmit();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Cột trái: thăm khám */}
      <form id="visit-form" action={formAction} className="space-y-4 lg:col-span-2">
        <input type="hidden" name="patient_id" value={patient.id} />
        <input type="hidden" name="next_action" value="save" ref={nextActionRef} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tứ chẩn</CardTitle>
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
            <BatCuongPicker />
            <div className="space-y-2">
              <Label htmlFor="doctor_notes">Ghi chú của thầy thuốc</Label>
              <Textarea id="doctor_notes" name="doctor_notes" rows={2} />
            </div>
          </CardContent>
        </Card>

        {state.error && (
          <p className="text-sm font-medium text-red-600">{state.error}</p>
        )}
      </form>

      {/* Cột phải: tóm tắt bệnh nhân + hành động (sticky) */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <Card className="border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-emerald-700" />
              {patient.full_name}
            </CardTitle>
            <p className="text-xs text-stone-500">{patient.patient_code}</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{calcAge(patient.date_of_birth)}</Badge>
              {patient.sex && (
                <Badge variant="secondary">{SEX_LABEL[patient.sex] ?? patient.sex}</Badge>
              )}
              <Badge variant="outline">{visitCount} lượt khám</Badge>
            </div>
            {patient.allergies && (
              <p className="flex items-start gap-1.5 rounded-md bg-red-50 p-2 text-xs text-red-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <span className="font-semibold">Dị ứng:</span> {patient.allergies}
                </span>
              </p>
            )}
            {patient.medical_history && (
              <p className="text-xs text-stone-600">
                <span className="font-semibold">Tiền sử:</span> {patient.medical_history}
              </p>
            )}
            {patient.phone && (
              <p className="text-xs text-stone-500">SĐT: {patient.phone}</p>
            )}
          </CardContent>
        </Card>

        <div className="mt-3 flex flex-col gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() => submitWith("prescribe")}
            className="bg-emerald-800 hover:bg-emerald-900"
          >
            {pending ? "Đang lưu..." : "Lưu & Kê đơn ngay"}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => submitWith("save")}
              className="flex-1"
            >
              {pending ? "Đang lưu..." : "Lưu lượt khám"}
            </Button>
            <Link href={`/patients/${patient.id}`} className="flex-1">
              <Button type="button" variant="ghost" className="w-full" disabled={pending}>
                Hủy
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
