"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { createSupplier, updateSupplier, type ActionState, type Supplier } from "@/features/suppliers/actions";

export function SupplierForm({
  id,
  initial,
}: {
  id?: string;
  initial?: Supplier;
}) {
  const action = id ? updateSupplier.bind(null, id) : createSupplier;
  const [state, formAction, pending] = useActionState(action, {} as ActionState);

  const F = ({ name, label, required, placeholder, type }: {
    name: string; label: string; required?: boolean; placeholder?: string; type?: string;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}{required && " *"}</Label>
      <Input
        id={name} name={name} type={type ?? "text"}
        maxLength={200} required={required}
        defaultValue={(initial?.[name as keyof Supplier] as string) ?? ""}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Thông tin doanh nghiệp & Liên hệ</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-0 md:grid-cols-2 md:p-6 md:pt-0">
          <F name="name" label="Tên nhà cung cấp" required placeholder="VD: Công ty Dược liệu Nam Á" />
          <F name="tax_code" label="Mã số thuế" placeholder="0312345678" />
          <F name="contact_name" label="Người liên hệ" placeholder="Anh Tuấn" />
          <F name="contact_title" label="Chức vụ" placeholder="Kinh doanh" />
          <F name="phone" label="Số điện thoại" required placeholder="0901234567" />
          <F name="email" label="Email" type="email" placeholder="lienhe@duoclieu.vn" />
          <div className="md:col-span-2">
            <F name="address" label="Địa chỉ kho / văn phòng" placeholder="Q.5, TP.HCM" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Thông tin thanh toán & Ghi chú</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-0 md:grid-cols-3 md:p-6 md:pt-0">
          <F name="bank_account" label="Số tài khoản" placeholder="1234567890" />
          <F name="bank_name" label="Ngân hàng" placeholder="Vietcombank" />
          <F name="bank_owner" label="Chủ tài khoản" placeholder="CÔNG TY DƯỢC LIỆU NAM Á" />
          <div className="space-y-1.5 md:col-span-3">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note" name="note" rows={2}
              defaultValue={initial?.note ?? ""}
              placeholder="Chính sách chiết khấu, thời hạn thanh toán..."
            />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="text-sm font-medium text-red-600">{state.error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Link href={id ? `/suppliers/${id}` : "/suppliers"}>
          <Button type="button" variant="outline">Hủy</Button>
        </Link>
        <Button type="submit" disabled={pending} className="bg-emerald-800 hover:bg-emerald-900">
          {pending ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </form>
  );
}
