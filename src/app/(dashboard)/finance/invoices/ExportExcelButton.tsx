"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { listInvoices } from "@/features/finance/actions";

const STATUS_LABEL: Record<string, string> = {
  unpaid: "Chưa thu",
  partial: "Thu một phần",
  paid: "Đã thu đủ",
  cancelled: "Đã hủy",
};

export function ExportExcelButton() {
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    setBusy(true);
    try {
      const rows = await listInvoices();
      const header = ["Mã HĐ", "Bệnh nhân", "SĐT", "Ngày lập", "Tổng tiền", "Đã thu", "Còn lại", "Trạng thái"];
      const lines = [header.join("\t")];
      for (const r of rows) {
        lines.push([
          r.invoice_code,
          r.patient_name,
          r.patient_phone ?? "",
          new Date(r.created_at).toLocaleDateString("vi-VN"),
          String(Math.round(r.total)),
          String(Math.round(r.paid_total)),
          String(Math.round(r.remaining)),
          STATUS_LABEL[r.status] ?? r.status,
        ].join("\t"));
      }
      const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/tab-separated-values;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hoa-don-${new Date().toISOString().slice(0, 10)}.xls`;
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
