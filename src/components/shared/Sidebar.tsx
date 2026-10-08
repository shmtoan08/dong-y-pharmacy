"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Users,
  Stethoscope,
  UserCog,
  Leaf,
  CalendarClock,
  FileText,
  Package,
  ClipboardCheck,
  Truck,
  Receipt,
  Wallet,
  TrendingUp,
  BarChart3,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { InfoModal } from "./InfoModal";

interface MenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  comingSoon?: boolean;
  section?: string;
}

const MENU: MenuItem[] = [
  // Tổng quan
  { href: "/", label: "Bảng điều khiển", icon: Home, section: "Tổng quan" },
  // Khám chữa bệnh
  { href: "/appointments", label: "Tiếp đón & Lịch hẹn", icon: CalendarClock, permission: "appointments.view", section: "Khám chữa bệnh" },
  { href: "/visits", label: "Khám bệnh & Bệnh án", icon: Stethoscope, permission: "visits.view", section: "Khám chữa bệnh" },
  { href: "/patients", label: "Hồ sơ bệnh nhân", icon: Users, permission: "patients.view", section: "Khám chữa bệnh" },
  { href: "/prescriptions", label: "Kê đơn & Bốc thuốc", icon: FileText, permission: "prescriptions.view", section: "Khám chữa bệnh" },
  // Kho dược liệu
  { href: "/herbs", label: "Danh mục vị thuốc", icon: Leaf, permission: "herbs.view", section: "Kho dược liệu" },
  { href: "/herb-interactions", label: "Tương kỵ dược liệu", icon: AlertTriangle, permission: "herbs.view", section: "Kho dược liệu" },
  { href: "/formulas", label: "Bài thuốc mẫu", icon: BookOpen, permission: "formulas.view", section: "Kho dược liệu" },
  { href: "/suppliers", label: "Nhà cung cấp", icon: Truck, permission: "inventory.view", section: "Kho dược liệu" },
  { href: "/stock-receipts", label: "Phiếu nhập kho", icon: Package, permission: "inventory.view", section: "Kho dược liệu" },
  { href: "/stock-lots", label: "Quản lý lô hàng", icon: ClipboardCheck, permission: "inventory.view", section: "Kho dược liệu" },
  { href: "/stock-checks", label: "Kiểm kho", icon: ClipboardCheck, permission: "inventory.view", section: "Kho dược liệu" },
  // Tài chính
  { href: "/finance/invoices", label: "Hóa đơn & Thanh toán", icon: Receipt, permission: "finance.invoices.view", section: "Tài chính" },
  { href: "/finance/ledger", label: "Sổ quỹ & Công nợ", icon: Wallet, permission: "finance.ledger.view", section: "Tài chính" },
  // Báo cáo
  { href: "/reports/revenue", label: "Doanh thu & Lợi nhuận", icon: TrendingUp, permission: "reports.view", section: "Báo cáo" },
  { href: "/reports/herbs", label: "Tiêu hao dược liệu", icon: BarChart3, permission: "reports.view", section: "Báo cáo" },
  { href: "/reports/visits", label: "Lượt khám & Bệnh nhân", icon: Activity, permission: "reports.view", section: "Báo cáo" },
  // Hệ thống
  { href: "/admin/staff", label: "Nhân viên & Bác sĩ", icon: UserCog, permission: "admin.users.view", section: "Hệ thống" },
  { href: "/admin/roles", label: "Phân quyền", icon: ShieldCheck, permission: "admin.users.manage", section: "Hệ thống" },
  { href: "/admin/settings", label: "Cài đặt chung", icon: Settings, permission: "admin.users.manage", section: "Hệ thống" },
];

export function Sidebar({
  permissions,
  onNavigate,
}: {
  permissions: string[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = MENU.filter((m) => !m.permission || permissions.includes(m.permission));
  const [comingSoonLabel, setComingSoonLabel] = useState<string | null>(null);

  // Menu active = menu nguoi dung bam chon (luu sessionStorage),
  // khong tu doi khi bam link ben trong trang. Chi doi khi chon menu khac.
  const urlActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const [activeHref, setActiveHref] = useState<string | null>(null);
  useEffect(() => {
    const saved = sessionStorage.getItem("dongy_active_menu");
    if (saved && items.some((m) => m.href === saved)) {
      setActiveHref(saved);
    } else {
      const match = items.find((m) => urlActive(m.href));
      setActiveHref(match ? match.href : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleMenuClick = (href: string) => {
    sessionStorage.setItem("dongy_active_menu", href);
    setActiveHref(href);
    onNavigate?.();
  };

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
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {items.map((item, idx) => {
          const showSection = item.section && (idx === 0 || items[idx - 1].section !== item.section);
          const active = activeHref === item.href;
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
            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
            active
              ? "bg-emerald-800 text-white shadow-md"
              : "text-emerald-100/70 hover:bg-emerald-900 hover:text-white",
            item.comingSoon && "opacity-60",
          );
          const menuLink = item.comingSoon ? (
            // Mục "Sắp có": bấm được → hiện modal thông báo (không dùng window.alert)
            <button
              type="button"
              className={cn(cls, "cursor-pointer text-left")}
              onClick={() => setComingSoonLabel(item.label)}
            >
              {content}
            </button>
          ) : (
            <Link
              href={item.href}
              className={cls}
              onClick={() => handleMenuClick(item.href)}
            >
              {content}
            </Link>
          );
          return (
            <div key={item.href}>
              {showSection && (
                <p className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-300/50">
                  {item.section}
                </p>
              )}
              {menuLink}
            </div>
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
