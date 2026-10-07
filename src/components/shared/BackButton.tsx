"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Nút quay về trang trước đó (dùng lịch sử trình duyệt).
 * Nếu không có lịch sử (mở link trực tiếp), về href fallback.
 */
export function BackButton({ href, label = "Quay lại" }: { href: string; label?: string }) {
  const router = useRouter();

  const onClick = () => {
    // Có lịch sử trong tab này → back thật; không thì về trang fallback
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(href);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-stone-600 hover:text-stone-900"
      onClick={onClick}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
