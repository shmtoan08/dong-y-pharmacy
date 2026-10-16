"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Nút quay lại: luôn về thẳng href (không dùng browser history).
 * Tránh trường hợp Edit -> Lưu -> Chi tiết -> Quay lại lại về Edit.
 */
export function BackButton({ href, label = "Quay lại" }: { href: string; label?: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className="gap-1.5 text-stone-600 hover:text-stone-900"
    >
      <Link href={href}>
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}
