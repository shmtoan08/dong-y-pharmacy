"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  toggleFormulaActive,
  duplicateFormula,
} from "@/features/formulas/actions";

export function FormulaDetailActions({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    const msg = isActive
      ? "Ngưng sử dụng bài thuốc này?"
      : "Kích hoạt lại bài thuốc này?";
    if (!confirm(msg)) return;
    setError(null);
    startTransition(async () => {
      try {
        await toggleFormulaActive(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  };

  const handleDuplicate = () => {
    if (!confirm("Nhân bản bài thuốc này thành bài mới?")) return;
    setError(null);
    startTransition(async () => {
      try {
        const newId = await duplicateFormula(id);
        router.push(`/formulas/${newId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={pending}>
          Nhân bản
        </Button>
        <Button
          variant={isActive ? "destructive" : "default"}
          size="sm"
          onClick={handleToggle}
          disabled={pending}
        >
          {isActive ? "Ngưng dùng" : "Kích hoạt"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
