"use client";

import { BackButton } from "@/components/shared/BackButton";
import { useActionState } from "react";
import Link from "next/link";
import { createUser } from "@/features/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewStaffPage() {
  const [state, formAction, pending] = useActionState(createUser, {});

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <BackButton href="/admin/staff" />
      <h1 className="text-2xl font-bold">Thêm nhân viên</h1>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin tài khoản</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Họ tên *</Label>
              <Input id="full_name" name="full_name" required maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="ten@phongthuoc.vn"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" name="phone" maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Vai trò *</Label>
              <Select name="role" defaultValue="dispenser" required>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Quản trị</SelectItem>
                  <SelectItem value="practitioner">Thầy thuốc</SelectItem>
                  <SelectItem value="dispenser">Nhân viên bốc thuốc</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu * (tối thiểu 6 ký tự)</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            {state.error && (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Đang tạo…" : "Tạo tài khoản"}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/staff">Hủy</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
