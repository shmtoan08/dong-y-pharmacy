"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVisitDetail, type VisitDetail } from "@/features/visits/actions";

const HAND_LABEL: Record<string, string> = { left: "Tay trái", right: "Tay phải" };
const POS_LABEL: Record<string, string> = {
  thon: "Thốn",
  quan: "Quan",
  xich: "Xích",
};

/** 1 dòng timeline lượt khám — bấm mở rộng xem chi tiết Tứ chẩn + Mạch */
export function VisitTimelineItem({
  visitId,
  visitedAt,
  practitionerName,
  diagnosis,
  canPrescribe,
}: {
  visitId: string;
  visitedAt: string;
  practitionerName: string;
  diagnosis: string | null;
  canPrescribe: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!detail && !loading) {
      setLoading(true);
      try {
        const d = await getVisitDetail(visitId);
        setDetail(d);
      } finally {
        setLoading(false);
      }
    }
  };

  const tuChan: { label: string; value: string | null }[] = detail
    ? [
        { label: "Vọng", value: detail.inspection_notes },
        { label: "Văn", value: detail.auscultation_notes },
        { label: "Vấn", value: detail.inquiry_notes },
        { label: "Thiết", value: detail.palpation_notes },
      ]
    : [];

  return (
    <div className="relative pl-8">
      <span className="absolute left-0 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-800">
        <Stethoscope className="h-2.5 w-2.5 text-white" />
      </span>
      <div className="rounded-lg border border-stone-200">
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center justify-between gap-2 p-3 text-left"
        >
          <div>
            <p className="text-sm font-semibold">
              {new Date(visitedAt).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {diagnosis && (
              <p className="mt-0.5 text-sm text-stone-700">
                <span className="font-medium">Chẩn đoán:</span> {diagnosis}
              </p>
            )}
          </div>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-stone-500">{practitionerName}</span>
            <ChevronDown
              className={`h-4 w-4 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        {open && (
          <div className="border-t border-stone-100 p-3">
            {loading ? (
              <p className="py-2 text-center text-sm text-stone-400">Đang tải...</p>
            ) : detail ? (
              <div className="space-y-3">
                <div className="grid gap-2 md:grid-cols-2">
                  {tuChan.map(
                    (t) =>
                      t.value && (
                        <div key={t.label} className="rounded-md bg-stone-50 p-2.5">
                          <p className="text-xs font-semibold text-stone-500">
                            {t.label}
                          </p>
                          <p className="mt-0.5 text-sm text-stone-700">{t.value}</p>
                        </div>
                      ),
                  )}
                </div>
                {detail.pulses.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-stone-500">
                      Bắt mạch
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
                      {detail.pulses.map((p, idx) => (
                        <p
                          key={idx}
                          className="rounded-md bg-stone-50 px-2 py-1.5 text-xs text-stone-700"
                        >
                          <span className="font-medium">
                            {HAND_LABEL[p.hand] ?? p.hand} · {POS_LABEL[p.position] ?? p.position}:
                          </span>{" "}
                          {p.pattern_name ?? p.custom_note ?? "—"}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {detail.doctor_notes && (
                  <p className="text-sm text-stone-600">
                    <span className="font-medium">Ghi chú:</span> {detail.doctor_notes}
                  </p>
                )}
                {canPrescribe && (
                  <Link href={`/prescriptions/new?visitId=${visitId}`}>
                    <Button variant="link" size="sm" className="h-auto p-0 text-emerald-700">
                      + Kê đơn cho lượt khám này
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <p className="py-2 text-center text-sm text-stone-400">
                Không tải được chi tiết.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
