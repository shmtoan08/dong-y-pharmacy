"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Users,
  Stethoscope,
  UserCog,
  Leaf,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { InfoModal } from "./InfoModal";

type Role = "admin" | "practitioner" | "dispenser";

interface MenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
  comingSoon?: boolean;
}

const MENU: MenuItem[] = [
  { href: "/", label: "Trang chủ", icon: Home, roles: ["admin", "practitioner", "dispenser"] },
  { href: "/formulas", label: "Bài thuốc", icon: BookOpen, roles: ["admin", "practitioner", "dispenser"] },
  { href: "/patients", label: "Bệnh nhân", icon: Users, roles: ["admin", "practitioner", "dispenser"] },
  { href: "/visits", label: "Khám bệnh", icon: Stethoscope, roles: ["admin", "practitioner"] },
  { href: "/herbs", label: "Vị thuốc", icon: Leaf, roles: ["admin", "practitioner", "dispenser"] },
  { href: "/admin/staff", label: "Nhân viên", icon: UserCog, roles: ["admin"] },
];

export function Sidebar({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = MENU.filter((m) => m.roles.includes(role));
  const [comingSoonLabel, setComingSoonLabel] = useState<string | null>(null);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-emerald-950 text-emerald-50">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-emerald-800/60 px-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-md">
          <Leaf className="h-5 w-5 text-amber-300" />
        </span>
        <div>
          <p className="text-sm font-bold tracking-wide">ĐÔNG Y ĐƯỜNG</p>
          <p className="text-[11px] text-emerald-300/80">Phòng thuốc Đông y</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const content = (
            <>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.comingSoon && (
                <Badge
                  variant="secondary"
                  className="bg-amber-400/20 text-[10px] text-amber-300 hover:bg-amber-400/20"
                >
                  Sắp có
                </Badge>
              )}
            </>
          );
          const cls = cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
            active
              ? "bg-emerald-800 text-white shadow-md"
              : "text-emerald-100/70 hover:bg-emerald-900 hover:text-white",
            item.comingSoon && "opacity-60",
          );
          // Mục "Sắp có": bấm được → hiện modal thông báo (không dùng window.alert)
          if (item.comingSoon) {
            return (
              <button
                key={item.href}
                type="button"
                className={cn(cls, "cursor-pointer text-left")}
                onClick={() => setComingSoonLabel(item.label)}
              >
                {content}
              </button>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cls}
              onClick={() => onNavigate?.()}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      {/* Footer — padding-bottom cho safe area mobile */}
      <div className="border-t border-emerald-800/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="text-center text-[11px] text-emerald-300/60">
          Tâm đức • Uy tín • Tận tâm
        </p>
      </div>

      {/* Modal thông báo chức năng đang phát triển */}
      <InfoModal
        open={comingSoonLabel !== null}
        onOpenChange={(open) => {
          if (!open) setComingSoonLabel(null);
        }}
        title={`Chức năng "${comingSoonLabel ?? ""}"`}
        description="Đang được phát triển, sẽ sớm ra mắt."
      />
    </aside>
  );
}
