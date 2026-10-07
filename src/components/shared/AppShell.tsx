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
  children,
}: {
  user: SessionUser;
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
    <div className="flex min-h-screen bg-stone-50">
      {/* Sidebar desktop — ẩn trên mobile */}
      <div className="hidden lg:block">
        <Sidebar role={user.role} />
      </div>

      {/* Drawer mobile — w-64 khít với Sidebar bên trong.
          Đóng bằng: tap ra ngoài overlay, phím Esc, hoặc bấm menu item */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 shadow-xl">
            <Sidebar role={user.role} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
