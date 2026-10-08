"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LedgerMethodFilter() {
  const router = useRouter();
  const sp = useSearchParams();
  const method = sp.get("method") ?? "all";

  const onChange = (v: string) => {
    const params = new URLSearchParams(sp.toString());
    if (v === "all") params.delete("method");
    else params.set("method", v);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Quỹ</Label>
      <Select value={method} onValueChange={onChange}>
        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả</SelectItem>
          <SelectItem value="cash">Tiền mặt</SelectItem>
          <SelectItem value="transfer">Chuyển khoản</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
