"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function LedgerExportButton({
  getData,
}: {
  getData: () => Promise<{ headers: string[]; rows: string[][] }>;
}) {
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    setBusy(true);
    try {
      const { headers, rows } = await getData();
      const lines = [headers.join("\t")];
      for (const r of rows) lines.push(r.join("\t"));
      const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/tab-separated-values;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `so-quy-${new Date().toISOString().slice(0, 10)}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={onExport} disabled={busy}>
      <Download className="mr-1 h-4 w-4" />
      {busy ? "Đang xuất..." : "Xuất Excel"}
    </Button>
  );
}
