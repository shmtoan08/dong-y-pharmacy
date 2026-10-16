"use client";

import { useState, useEffect, useMemo } from "react";
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
  Globe,
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
  ListOrdered,
  CalendarDays,
  LayoutGrid,
  Search,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
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
  section: string;
  badge?: string;
}

const MENU: MenuItem[] = [
  // Tổng quan
  { href: "/", label: "Bảng điều khiển", icon: Home, section: "Tổng quan" },

  // Khám chữa bệnh
  { href: "/appointments", label: "Tiếp đón & Lịch hẹn", icon: CalendarClock, permission: "appointments.view", section: "Khám chữa bệnh" },
  { href: "/appointments/online", label: "Đặt lịch online", icon: Globe, permission: "appointments.view", section: "Khám chữa bệnh", badge: "pendingBookings" },
  { href: "/appointments/queue", label: "Hàng đợi hôm nay", icon: ListOrdered, permission: "appointments.view", section: "Khám chữa bệnh" },
  { href: "/schedules", label: "Lịch làm việc", icon: CalendarDays, permission: "schedules.view", section: "Khám chữa bệnh" },
  { href: "/schedules/master", label: "Lịch trực PK", icon: LayoutGrid, permission: "schedules.view", section: "Khám chữa bệnh" },
  { href: "/visits", label: "Khám bệnh & Bệnh án", icon: Stethoscope, permission: "visits.view", section: "Khám chữa bệnh" },
  { href: "/diagnosis", label: "Chẩn đoán", icon: Search, permission: "visits.view", section: "Khám chữa bệnh" },
  { href: "/patients", label: "Hồ sơ bệnh nhân", icon: Users, permission: "patients.view", section: "Khám chữa bệnh" },
  { href: "/prescriptions", label: "Kê đơn & Bốc thuốc", icon: FileText, permission: "prescriptions.view", section: "Khám chữa bệnh" },

  // Kho dược liệu
  { href: "/herbs", label: "Danh mục vị thuốc", icon: Leaf, permission: "herbs.view", section: "Kho dược liệu" },
  { href: "/herb-interactions", label: "Tương kỵ dược liệu", icon: AlertTriangle, permission: "herbs.view", section: "Kho dược liệu" },
  { href: "/formulas", label: "Bài thuốc mẫu", icon: BookOpen, permission: "formulas.view", section: "Kho dược liệu" },
  { href: "/clinical-cases", label: "Bệnh án kinh nghiệm", icon: BookOpen, permission: "formulas.view", section: "Kho dược liệu" },
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
  clinicName,
  clinicLogoUrl,
}: {
  permissions: string[];
  onNavigate?: () => void;
  clinicName: string;
  clinicLogoUrl?: string;
}) {
  const pathname = usePathname();
  const [comingSoonLabel, setComingSoonLabel] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Trạng thái thu gọn Mini Sidebar trên Desktop (Icon-only)
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Trạng thái đóng/mở từng nhóm Accordion
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Đọc cấu hình từ localStorage sau khi mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedCollapsed = localStorage.getItem("dongy_sidebar_collapsed") === "true";
        if (savedCollapsed) setIsCollapsed(true);

        const savedSections = localStorage.getItem("dongy_sidebar_collapsed_sections");
        if (savedSections) {
          setCollapsedSections(JSON.parse(savedSections));
        }
      } catch {}
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Lấy số lượng đặt lịch online chờ duyệt
  useEffect(() => {
    fetch("/api/internal/pending-bookings")
      .then((r) => r.json())
      .then((d) => setPendingCount(d.count || 0))
      .catch(() => {});
  }, []);

  // Lọc các menu theo quyền
  const items = useMemo(() => {
    return MENU.filter((m) => !m.permission || permissions.includes(m.permission));
  }, [permissions]);

  // Gom menu theo Section
  const groupedSections = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      const list = map.get(item.section) ?? [];
      list.push(item);
      map.set(item.section, list);
    }
    return Array.from(map.entries());
  }, [items]);

  // Tính menu active trực tiếp từ URL, đồng bộ tức thời
  const activeHref = useMemo(() => {
    return (
      items.find((m) => (m.href === "/" ? pathname === "/" : pathname.startsWith(m.href)))
        ?.href || null
    );
  }, [items, pathname]);

  // Tìm section đang chứa trang active để không bao giờ đóng nhầm
  const activeSection = useMemo(() => {
    return items.find((m) => m.href === activeHref)?.section || null;
  }, [items, activeHref]);

  // Toggle thu gọn Mini-Sidebar (Desktop)
  const toggleMiniSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("dongy_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Toggle đóng/mở Accordion từng nhóm
  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [section]: !prev[section] };
      try {
        localStorage.setItem("dongy_sidebar_collapsed_sections", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col bg-white border-r border-stone-200 text-stone-800 transition-all duration-300 ease-in-out select-none shadow-xs",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand / Logo Header */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-stone-200 bg-white px-3",
          isCollapsed ? "justify-center" : "gap-3 px-4"
        )}
      >
        {clinicLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clinicLogoUrl}
            alt={clinicName}
            className="h-9 w-9 shrink-0 rounded-lg object-contain bg-stone-50 p-0.5 border border-stone-200 shadow-2xs"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-amber-300 shadow-xs">
            <Leaf className="h-5 w-5" />
          </span>
        )}

        {!isCollapsed && (
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-sm font-bold tracking-wide text-stone-900">
              {clinicName}
            </p>
            <p className="truncate text-xs font-semibold text-emerald-800">Phòng thuốc Đông y</p>
          </div>
        )}
      </div>

      {/* Danh sách Menu (Custom Light Scrollbar) */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-2 py-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-stone-300">
        {groupedSections.map(([sectionName, sectionItems]) => {
          // Nhóm "Tổng quan" hiển thị đơn giản không cần collapsible header
          const isOverview = sectionName === "Tổng quan";
          // Nhóm bị thu gọn (ngoại trừ nhóm đang chứa activeHref luôn tự mở)
          const isSectionCollapsed = !isOverview && Boolean(collapsedSections[sectionName]) && activeSection !== sectionName;

          return (
            <div key={sectionName} className={cn("space-y-1", !isOverview && "pt-2.5")}>
              {/* Tiêu đề nhóm (Section Header) có màu nền nhẹ phân biệt */}
              {!isOverview && (
                <>
                  {!isCollapsed ? (
                    <button
                      type="button"
                      onClick={() => toggleSection(sectionName)}
                      className="group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider bg-stone-100/90 text-stone-700 hover:bg-stone-200/80 hover:text-stone-900 border border-stone-200/70 transition-colors shadow-2xs mb-1"
                    >
                      <span className="truncate">{sectionName}</span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-stone-500 transition-transform duration-200 group-hover:text-stone-800",
                          isSectionCollapsed ? "-rotate-90" : "rotate-0"
                        )}
                      />
                    </button>
                  ) : (
                    <div className="my-2 border-t border-stone-200" />
                  )}
                </>
              )}

              {/* Các menu con trong nhóm */}
              {(!isSectionCollapsed || isCollapsed) && (
                <div className={cn("space-y-0.5", !isCollapsed && "pl-1")}>
                  {sectionItems.map((item) => {
                    const active = activeHref === item.href;
                    const Icon = item.icon;

                    const content = (
                      <>
                        <Icon
                          className={cn(
                            "h-4.5 w-4.5 shrink-0 transition-colors",
                            active ? "text-white" : "text-stone-500 group-hover:text-stone-800"
                          )}
                        />
                        {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}

                        {/* Badge thông báo */}
                        {item.badge === "pendingBookings" && pendingCount > 0 && (
                          <>
                            {!isCollapsed ? (
                              <Badge className="bg-red-600 text-[10px] text-white hover:bg-red-600 px-1.5 py-0 font-bold">
                                {pendingCount}
                              </Badge>
                            ) : (
                              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
                              </span>
                            )}
                          </>
                        )}

                        {!isCollapsed && item.comingSoon && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] px-1.5 py-0"
                          >
                            Sắp có
                          </Badge>
                        )}
                      </>
                    );

                    const itemClass = cn(
                      "group relative flex items-center rounded-lg text-sm font-medium transition-all duration-150",
                      isCollapsed
                        ? "justify-center h-10 w-10 mx-auto px-0"
                        : "w-full gap-3 px-3 py-2",
                      active
                        ? "bg-emerald-800 text-white shadow-xs font-semibold hover:bg-emerald-900"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
                      item.comingSoon && "opacity-60"
                    );

                    return item.comingSoon ? (
                      <button
                        key={item.href}
                        type="button"
                        title={isCollapsed ? item.label : undefined}
                        className={cn(itemClass, "cursor-pointer text-left")}
                        onClick={() => setComingSoonLabel(item.label)}
                      >
                        {content}
                      </button>
                    ) : (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={isCollapsed ? item.label : undefined}
                        className={itemClass}
                        onClick={() => onNavigate?.()}
                      >
                        {content}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Sidebar & Toggle Collapse */}
      <div className="border-t border-stone-200 bg-stone-50/70 p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-2">
          {!isCollapsed && (
            <p className="flex-1 truncate px-2 text-xs text-stone-400 italic font-serif">
              Tâm đức • Uy tín • Tận tâm
            </p>
          )}

          {/* Nút thu gọn / mở rộng Mini-Sidebar trên Desktop */}
          <button
            type="button"
            onClick={toggleMiniSidebar}
            title={isCollapsed ? "Mở rộng thanh menu (Ctrl+[)" : "Thu gọn thanh menu"}
            className={cn(
              "hidden lg:flex items-center justify-center rounded-md p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-800 transition-colors",
              isCollapsed && "w-full"
            )}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4.5 w-4.5" />
            ) : (
              <PanelLeftClose className="h-4.5 w-4.5" />
            )}
          </button>
        </div>
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
