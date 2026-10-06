"use client";

import { useTransition } from "react";
import { toggleUserActive } from "@/features/users/actions";
import { Button } from "@/components/ui/button";

export function ToggleActiveButton({
  id,
  isActive,
  name,
}: {
  id: string;
  isActive: boolean;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    const msg = isActive
      ? `Khóa tài khoản của ${name}? Người này sẽ không đăng nhập được nữa.`
      : `Mở khóa tài khoản của ${name}?`;
    if (!confirm(msg)) return;
    startTransition(async () => {
      try {
        await toggleUserActive(id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  };

  return (
    <Button
      variant={isActive ? "destructive" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={pending}
    >
      {isActive ? "Khóa" : "Mở khóa"}
    </Button>
  );
}
