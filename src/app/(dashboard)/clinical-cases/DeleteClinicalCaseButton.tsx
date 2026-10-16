"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteClinicalCase } from "@/features/clinical-cases/actions";

/** Nút xóa 1 biện chứng (modal xác nhận). Dùng ở danh sách + chi tiết. */
export function DeleteClinicalCaseButton({
  caseId,
  patternName,
  variant = "icon",
}: {
  caseId: string;
  patternName: string;
  variant?: "icon" | "button";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteClinicalCase(caseId);
        setConfirmOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  };

  return (
    <>
      {variant === "button" ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
        >
          <Trash2 className="mr-1 h-4 w-4" /> Xóa
        </Button>
      ) : (
        <Tooltip label="Xóa biện chứng">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-stone-500 hover:text-red-600"
            onClick={() => setConfirmOpen(true)}
            disabled={pending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </Tooltip>
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={(v) => {
          setConfirmOpen(v);
          if (!v) setError(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader className="flex flex-row items-center gap-3 space-y-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-700" />
            </span>
            <div>
              <DialogTitle className="text-left">Xóa biện chứng</DialogTitle>
              <DialogDescription className="text-left">
                Xóa biện chứng &quot;{patternName}&quot;? Hành động này không thể hoàn tác.
              </DialogDescription>
            </div>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending ? "Đang xóa..." : "Xóa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
