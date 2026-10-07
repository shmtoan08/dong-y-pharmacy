"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { toggleSupplierActive } from "@/features/suppliers/actions";

export function ToggleSupplierButton({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Tooltip label={isActive ? "Ngừng hợp tác" : "Hợp tác lại"}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await toggleSupplierActive(id);
          router.refresh();
        }}
      >
        <Power className={`h-4 w-4 ${isActive ? "text-stone-400" : "text-emerald-600"}`} />
      </Button>
    </Tooltip>
  );
}
