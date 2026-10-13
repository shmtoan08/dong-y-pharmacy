"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf } from "lucide-react";
import Image from "next/image";

export function LoginForm({
  clinicName,
  clinicLogoUrl,
}: {
  clinicName: string;
  clinicLogoUrl?: string;
}) {
  const [state, formAction, pending] = useActionState(login, {});

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-emerald-950 p-4">
      {/* Nền trang trí */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, #a7f3d0 0, transparent 45%), radial-gradient(circle at 85% 80%, #fbbf24 0, transparent 40%), radial-gradient(circle at 50% 50%, #059669 0, transparent 60%)",
        }}
      />
      {/* Họa tiết lá mờ */}
      <Leaf
        className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 text-emerald-800/40"
        strokeWidth={0.5}
      />
      <Leaf
        className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 text-emerald-800/30"
        strokeWidth={0.5}
      />

      <div className="relative w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center text-center">
          {clinicLogoUrl ? (
            <Image
              src={clinicLogoUrl}
              alt={clinicName}
              width={64}
              height={64}
              className="mb-4 h-16 w-16 rounded-2xl object-cover shadow-lg"
            />
          ) : (
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-lg">
              <Leaf className="h-8 w-8 text-amber-300" />
            </span>
          )}
          <h1 className="text-xl font-bold tracking-wide text-white">
            {clinicName}
          </h1>
          <p className="mt-1 text-sm text-emerald-300/70">
            Y học cổ truyền, quản lý hiện đại
          </p>
        </div>

        {/* Form */}
        <form
          action={formAction}
          className="rounded-2xl bg-white p-6 shadow-2xl space-y-5 sm:p-8"
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

        <p className="mt-6 text-center text-xs text-emerald-300/50">
          Quên mật khẩu? Liên hệ quản trị viên phòng khám.
        </p>
      </div>
    </div>
  );
}
