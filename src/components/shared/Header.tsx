"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/logout/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Quản trị viên",
  practitioner: "Thầy thuốc",
  dispenser: "Nhân viên bốc thuốc",
};

const ROLE_BADGE_STYLE: Record<string, string> = {
  admin: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  practitioner: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  dispenser: "bg-stone-200 text-stone-700 hover:bg-stone-200",
};

export function Header({ user }: { user: SessionUser }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-stone-200 bg-white px-6">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
        </span>
        <p className="text-sm text-stone-500">
          Hệ thống quản lý phòng thuốc Đông y
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-800 text-sm font-semibold text-white">
            {user.full_name.charAt(0).toUpperCase()}
          </span>
          <div className="text-right">
            <p className="text-sm font-medium text-stone-900">
              {user.full_name}
            </p>
            <Badge
              variant="secondary"
              className={`text-[11px] ${ROLE_BADGE_STYLE[user.role] ?? ROLE_BADGE_STYLE.dispenser}`}
            >
              {ROLE_LABEL[user.role] ?? user.role}
            </Badge>
          </div>
        </div>
        <form action={logout}>
          <Button
            variant="ghost"
            size="icon"
            title="Đăng xuất"
            className="rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-900"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
