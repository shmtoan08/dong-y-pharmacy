"use client";

import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Nút xuất CSV danh sách bệnh nhân theo bộ lọc hiện tại */
export function ExportPatientsButton() {
  const searchParams = useSearchParams();

  const onClick = () => {
    const params = new URLSearchParams();
    for (const key of ["q", "sex", "visit"]) {
      const v = searchParams.get(key);
      if (v) params.set(key, v);
    }
    const url = `/api/patients/export${params.toString() ? `?${params.toString()}` : ""}`;
    window.location.href = url;
  };

  return (
    <Button variant="outline" onClick={onClick}>
      <Download className="mr-1 h-4 w-4" /> Xuất Excel
    </Button>
  );
}
