"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Stethoscope, Pill, ClipboardList } from "lucide-react";

const highlights = [
  { icon: Stethoscope, text: "Quản lý khám chữa bệnh" },
  { icon: Pill, text: "Kho dược liệu & bốc thuốc" },
  { icon: ClipboardList, text: "Đơn thuốc & hóa đơn" },
];

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, {});

  return (
    <div className="flex min-h-screen bg-stone-50">
      {/* Panel trái — branding (ẩn trên mobile) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-emerald-950 p-10 text-emerald-50 lg:flex">
        {/* Họa tiết trang trí */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, #a7f3d0 0, transparent 40%), radial-gradient(circle at 80% 70%, #fbbf24 0, transparent 35%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-lg">
            <Leaf className="h-6 w-6 text-amber-300" />
          </span>
          <div>
            <p className="text-lg font-bold tracking-wide">ĐÔNG Y ĐƯỜNG</p>
            <p className="text-xs text-emerald-300/80">Phòng thuốc Đông y</p>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-3xl font-bold leading-snug">
            Y học cổ truyền,
            <br />
            <span className="text-amber-300">quản lý hiện đại.</span>
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-emerald-200/80">
            Hệ thống quản lý phòng khám Đông y toàn diện — từ tiếp đón, khám
            bệnh, kê đơn đến kho dược liệu và tài chính.
          </p>
          <ul className="space-y-3">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800/60">
                  <Icon className="h-4 w-4 text-amber-300" />
                </span>
                <span className="text-emerald-100/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-emerald-300/60">
          © 2026 Đông Y Đường. Bảo mật & riêng tư được đảm bảo.
        </p>
      </div>

      {/* Panel phải — form đăng nhập */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-900 shadow-md">
              <Leaf className="h-5 w-5 text-amber-300" />
            </span>
            <div>
              <p className="text-base font-bold tracking-wide text-emerald-950">
                ĐÔNG Y ĐƯỜNG
              </p>
              <p className="text-xs text-stone-500">Phòng thuốc Đông y</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-emerald-950">
              Chào mừng trở lại
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Đăng nhập để tiếp tục công việc
            </p>
          </div>

          <form
            action={formAction}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-emerald-950">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="ten@phongthuoc.vn"
                className="h-11 border-stone-200 focus-visible:ring-emerald-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-emerald-950">
                Mật khẩu
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="h-11 border-stone-200 focus-visible:ring-emerald-600"
              />
            </div>
            {state.error && (
              <p
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                {state.error}
              </p>
            )}
            <Button
              type="submit"
              className="h-11 w-full bg-emerald-800 text-base font-semibold hover:bg-emerald-900"
              disabled={pending}
            >
              {pending ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-stone-400">
            Quên mật khẩu? Liên hệ quản trị viên phòng khám.
          </p>
        </div>
      </div>
    </div>
  );
}
