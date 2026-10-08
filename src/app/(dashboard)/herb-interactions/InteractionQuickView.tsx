"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import {
  CATEGORY_LABEL,
  CONTRA_LABEL,
} from "@/features/prescriptions/interactionConstants";
import type { InteractionRow } from "@/features/prescriptions/actions";

const SEVERITY: Record<string, { label: string; cls: string }> = {
  cam_ky: { label: "Cấm kỵ", cls: "bg-red-100 text-red-800" },
  can_trong: { label: "Cẩn trọng", cls: "bg-amber-100 text-amber-800" },
};

/** Xem nhanh chi tiết cặp tương kỵ (nguồn sách, cách giải độc) */
export function InteractionQuickView({ row }: { row: InteractionRow }) {
  const [open, setOpen] = useState(false);
  const sev = SEVERITY[row.severity];

  return (
    <>
      <Tooltip label="Xem nhanh">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setOpen(true)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {row.herb_a_name} <span className="text-red-600">⛔</span> {row.herb_b_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge className={sev.cls}>{sev.label}</Badge>
              <Badge variant="outline">{CATEGORY_LABEL[row.category]}</Badge>
              {row.verified ? (
                <Badge className="bg-emerald-100 text-emerald-800">Đã duyệt</Badge>
              ) : (
                <Badge className="bg-stone-200 text-stone-600">Chưa duyệt</Badge>
              )}
            </div>

            {row.contraindicated_for.length > 0 && (
              <div>
                <p className="font-medium text-stone-500">Đối tượng chống chỉ định</p>
                <p>{row.contraindicated_for.map((k) => CONTRA_LABEL[k] ?? k).join(", ")}</p>
              </div>
            )}

            {(row.symptoms || row.description) && (
              <div>
                <p className="font-medium text-stone-500">Hậu quả / Triệu chứng</p>
                <p className="text-stone-800">{row.symptoms ?? row.description}</p>
              </div>
            )}

            {row.antidote && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="font-medium text-emerald-800">Cách giải độc / Xử lý</p>
                <p className="text-emerald-900">{row.antidote}</p>
              </div>
            )}

            {row.source && (
              <div>
                <p className="font-medium text-stone-500">Nguồn tham khảo</p>
                <p className="text-stone-800">{row.source}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
