"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BackButton } from "@/components/shared/BackButton";
import { ReceiptItemEditor } from "./ReceiptItemEditor";
import { createReceipt, type ActionState } from "@/features/inventory/actions";
import type { Supplier } from "@/features/suppliers/actions";

export function NewReceiptForm({ suppliers }: { suppliers: Supplier[] }) {
  const [state, formAction, pending] = useActionState(createReceipt, {} as ActionState);
  const [supplierId, setSupplierId] = useState<string>("");

  return (
    <div className="space-y-4">
      <BackButton href="/stock-receipts" />
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Tạo phiếu nhập kho</h1>
        <p className="text-sm text-stone-500">Mã phiếu sẽ được sinh tự động (NK-YYYYMMDD-XXX)</p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="supplier_id" value={supplierId} />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Thông tin phiếu</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 pt-0 md:grid-cols-2 md:p-6 md:pt-0">
            <div className="space-y-1.5">
              <Label>Nhà cung cấp</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nhà cung cấp (không bắt buộc)" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.filter((s) => s.is_active).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea id="note" name="note" rows={1} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dòng phiếu nhập</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <ReceiptItemEditor />
          </CardContent>
        </Card>

        {state.error && (
          <p className="text-sm font-medium text-red-600">{state.error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Link href="/stock-receipts">
            <Button type="button" variant="outline">Hủy</Button>
          </Link>
          <Button type="submit" disabled={pending} className="bg-emerald-800 hover:bg-emerald-900">
            {pending ? "Đang lưu..." : "Lưu nháp"}
          </Button>
        </div>
      </form>
    </div>
  );
}
