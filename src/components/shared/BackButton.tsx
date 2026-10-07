"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Nút quay về cấp trước. Dùng href tường minh để luôn đúng,
 * không phụ thuộc lịch sử trình duyệt.
 */
export function BackButton({ href, label = "Quay lại" }: { href: string; label?: string }) {
  return (
    <Link href={href}>
      <Button variant="ghost" size="sm" className="gap-1.5 text-stone-600 hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}
