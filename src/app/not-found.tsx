import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Leaf, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 p-4 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-800 text-amber-300 shadow-md">
        <Leaf className="h-8 w-8" />
      </div>

      <span className="text-sm font-bold uppercase tracking-wider text-emerald-800">
        404 • Không tìm thấy trang
      </span>

      <h1 className="mt-2 text-2xl font-bold text-stone-900 md:text-3xl">
        Trang bạn tìm kiếm không tồn tại
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
        Đường dẫn có thể đã bị thay đổi, bị xóa hoặc bạn không có quyền truy cập vào liên kết này.
      </p>

      <div className="mt-6 flex items-center justify-center gap-3">
        <Link href="/">
          <Button className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-sm h-10 px-5 shadow-xs">
            <Home className="mr-2 h-4 w-4" />
            Về Bảng điều khiển
          </Button>
        </Link>
      </div>
    </div>
  );
}
