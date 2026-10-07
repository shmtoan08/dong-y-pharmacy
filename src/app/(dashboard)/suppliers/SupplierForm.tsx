"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { createSupplier, updateSupplier, type ActionState } from "@/features/suppliers/actions";

export function SupplierForm({
  id,
  initial,
}: {
  id?: string;
  initial?: { name: string; phone: string | null; address: string | null; note: string | null };
}) {
  const action = id ? updateSupplier.bind(null, id) : createSupplier;
  const [state, formAction, pending] = useActionState(action, {} as ActionState);

  return (
    <form action={formAction}>
      <Card className="max-w-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {id ? "Chỉnh sửa nhà cung cấp" : "Thêm nhà cung cấp mới"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 md:p-6 md:pt-0">
          <div className="space-y-1.5">
            <Label htmlFor="name">Tên nhà cung cấp *</Label>
            <Input id="name" name="name" maxLength={200} required
              defaultValue={initial?.name ?? ""} placeholder="VD: Dược liệu Hòa Bình" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" name="phone" maxLength={20} defaultValue={initial?.phone ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input id="address" name="address" maxLength={500} defaultValue={initial?.address ?? ""} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea id="note" name="note" rows={2} defaultValue={initial?.note ?? ""} />
          </div>
          {state.error && (
            <p className="text-sm font-medium text-red-600">{state.error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Link href="/suppliers">
              <Button type="button" variant="outline">Hủy</Button>
            </Link>
            <Button type="submit" disabled={pending} className="bg-emerald-800 hover:bg-emerald-900">
              {pending ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
