"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { duplicateFormula } from "@/features/formulas/actions";
import { InfoModal } from "@/components/shared/InfoModal";

/** Nút nhân bản bài thuốc → tạo bản sao rồi chuyển tới trang sửa */
export function DuplicateFormulaButton({ formulaId }: { formulaId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    try {
      const newId = await duplicateFormula(formulaId);
      router.push(`/formulas/${newId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nhân bản thất bại");
      setBusy(false);
    }
  };

  return (
    <>
      <Tooltip label="Nhân bản bài thuốc">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-stone-500 hover:text-emerald-700"
          onClick={onClick}
          disabled={busy}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </Tooltip>
      <InfoModal
        open={error !== null}
        onOpenChange={(o) => !o && setError(null)}
        title={error ?? ""}
      />
    </>
  );
}
