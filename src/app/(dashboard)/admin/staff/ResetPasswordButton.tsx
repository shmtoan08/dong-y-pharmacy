"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { resetUserPassword } from "@/features/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

/** Nút đặt lại mật khẩu cho nhân viên (dialog nhập mật khẩu mới) */
export function ResetPasswordButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async () => {
    setBusy(true);
    const res = await resetUserPassword(id, password);
    setBusy(false);
    if (res.error) {
      setInfo(res.error);
    } else {
      setOpen(false);
      setPassword("");
      setInfo(`Đã đặt lại mật khẩu cho ${name}`);
    }
  };

  return (
    <>
      <Tooltip label="Đặt lại mật khẩu">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-stone-500 hover:text-emerald-700"
          onClick={() => {
            setPassword("");
            setOpen(true);
          }}
        >
          <KeyRound className="h-4 w-4" />
        </Button>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Đặt lại mật khẩu</DialogTitle>
            <DialogDescription>
              Nhập mật khẩu mới cho {name} (ít nhất 6 ký tự). Tài khoản này sẽ
              bị đăng xuất khỏi tất cả thiết bị.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`pw-${id}`}>Mật khẩu mới</Label>
            <Input
              id={`pw-${id}`}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới..."
              autoComplete="new-password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Hủy
            </Button>
            <Button
              onClick={onSubmit}
              disabled={busy || password.length < 6}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              {busy ? "Đang xử lý..." : "Đặt lại"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoModal
        open={info !== null}
        onOpenChange={(o) => !o && setInfo(null)}
        title={info ?? ""}
      />
    </>
  );
}
