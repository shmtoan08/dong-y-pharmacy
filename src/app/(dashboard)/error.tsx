"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log lỗi để kiểm tra và debug
    console.error("Dashboard error caught by boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-200">
        <AlertCircle className="h-7 w-7" />
      </div>

      <h2 className="text-lg font-bold text-stone-900 md:text-xl">
        Đã xảy ra lỗi khi tải dữ liệu
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
        Hệ thống không thể tải thông tin của trang này. Vui lòng kiểm tra lại kết nối hoặc thử làm mới lại thao tác.
      </p>

      {error.digest && (
        <p className="mt-1 font-mono text-xs text-stone-400">
          Mã lỗi: {error.digest}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => reset()}
          className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-sm h-9 px-4"
        >
          <RotateCcw className="mr-1.5 h-4 w-4" />
          Thử lại
        </Button>
        <Link href="/">
          <Button variant="outline" className="border-stone-200 text-stone-700 h-9 px-4 text-sm">
            <Home className="mr-1.5 h-4 w-4" />
            Về Bảng điều khiển
          </Button>
        </Link>
      </div>
    </div>
  );
}
