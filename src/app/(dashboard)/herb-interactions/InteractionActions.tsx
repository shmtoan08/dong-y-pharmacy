"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { InfoModal } from "@/components/shared/InfoModal";
import { Tooltip } from "@/components/ui/tooltip";
import {
  verifyInteraction,
  unverifyInteraction,
  deleteInteraction,
} from "@/features/prescriptions/actions";

export function InteractionActions({
  id,
  verified,
  isAdmin,
}: {
  id: string;
  verified: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [delOpen, setDelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<{ error?: string }>) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.error) setError(res.error);
    else router.refresh();
  };

  const onDelete = async () => {
    setBusy(true);
    const res = await deleteInteraction(id);
    setBusy(false);
    setDelOpen(false);
    if (res.error) setError(res.error);
    else router.refresh();
  };

  return (
    <>
      <div className="flex justify-end gap-1">
        {!verified ? (
          <Tooltip label="Duyệt">
            <Button
              variant="ghost" size="icon" className="h-8 w-8 text-emerald-700"
              onClick={() => run(() => verifyInteraction(id))}
              disabled={busy}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          </Tooltip>
        ) : (
          <Tooltip label="Bỏ duyệt">
            <Button
              variant="ghost" size="icon" className="h-8 w-8 text-stone-500"
              onClick={() => run(() => unverifyInteraction(id))}
              disabled={busy}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </Tooltip>
        )}
        {(!verified || isAdmin) && (
          <Tooltip label="Xóa">
            <Button
              variant="ghost" size="icon" className="h-8 w-8 text-red-600"
              onClick={() => setDelOpen(true)}
              disabled={busy}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Tooltip>
        )}
      </div>

      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa cặp tương kỵ?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelOpen(false)} disabled={busy}>
              Để sau
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={busy}>
              {busy ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoModal
        open={error !== null}
        onOpenChange={(o) => !o && setError(null)}
        title={error ?? ""}
      />
    </>
  );
}
