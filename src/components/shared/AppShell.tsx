"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "practitioner" | "dispenser";
}

export function AppShell({
  user,
  permissions,
  clinicName,
  clinicLogoUrl,
  children,
}: {
  user: SessionUser;
  permissions: string[];
  clinicName: string;
  clinicLogoUrl?: string;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Khóa cuộn trang nền + đóng bằng phím Esc khi drawer mở
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen bg-stone-50 print:bg-white print:min-h-0">
      {/* Sidebar desktop — ẩn trên mobile và khi in */}
      <div className="hidden lg:block print:hidden">
        <Sidebar permissions={permissions} clinicName={clinicName} clinicLogoUrl={clinicLogoUrl} />
      </div>

      {/* Drawer mobile — w-64 khít với Sidebar bên trong. Ẩn khi in */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 shadow-xl">
            <Sidebar permissions={permissions} onNavigate={() => setDrawerOpen(false)} clinicName={clinicName} clinicLogoUrl={clinicLogoUrl} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col print:w-full">
        <div className="print:hidden">
          <Header user={user} onMenuClick={() => setDrawerOpen(true)} />
        </div>
        <main className="flex-1 p-4 md:p-6 print:p-0 print:m-0">{children}</main>
      </div>
    </div>
  );
}
