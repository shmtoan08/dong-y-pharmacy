"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen } from "lucide-react";
import { toggleUserActive } from "@/features/users/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { InfoModal } from "@/components/shared/InfoModal";

export function ToggleActiveButton({
  id,
  isActive,
  name,
}: {
  id: string;
  isActive: boolean;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onConfirm = () => {
    startTransition(async () => {
      try {
        await toggleUserActive(id);
        setOpen(false);
        router.refresh();
      } catch (e) {
        setOpen(false);
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  };

  return (
    <>
      <Tooltip label={isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-stone-500 hover:text-red-600"
          onClick={() => setOpen(true)}
        >
          {isActive ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
        </Button>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
            </DialogTitle>
            <DialogDescription>
              {isActive
                ? `Khóa tài khoản của ${name}? Người này sẽ không đăng nhập được nữa.`
                : `Mở khóa tài khoản của ${name}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Hủy
            </Button>
            <Button
              variant={isActive ? "destructive" : "default"}
              onClick={onConfirm}
              disabled={pending}
              className={isActive ? "" : "bg-emerald-700 hover:bg-emerald-800"}
            >
              {pending ? "Đang xử lý..." : isActive ? "Khóa" : "Mở khóa"}
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
