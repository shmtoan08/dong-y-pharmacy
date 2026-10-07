"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { InfoModal } from "@/components/shared/InfoModal";
import { reprisePrescription } from "@/features/prescriptions/actions";

/**
 * Nút "Bốc lại đơn này" — 1 click tạo lượt khám tái khám + đơn nháp
 * copy toàn bộ vị thuốc từ đơn cũ, chuyển tới trang sửa đơn mới.
 */
export function RepriseButton({
  prescriptionId,
  prescriptionCode,
}: {
  prescriptionId: string;
  prescriptionCode: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    const res = await reprisePrescription(prescriptionId);
    if (res.error) {
      setError(res.error);
      setBusy(false);
    } else if (res.newId) {
      router.push(`/prescriptions/${res.newId}`);
    }
  };

  return (
    <>
      <Tooltip label={`Bốc lại đơn ${prescriptionCode} cho lần tái khám`}>
        <Button
          variant="outline"
          size="sm"
          onClick={onClick}
          disabled={busy}
          className="text-emerald-700"
        >
          <Repeat className="mr-1 h-4 w-4" />
          {busy ? "Đang tạo..." : "Bốc lại đơn này"}
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
