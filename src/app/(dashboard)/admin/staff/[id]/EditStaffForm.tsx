"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateUser } from "@/features/users/actions";
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

interface StaffUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
}

export function EditStaffForm({ user }: { user: StaffUser }) {
  const [state, formAction, pending] = useActionState(
    updateUser.bind(null, user.id),
    {},
  );
  const router = useRouter();
  useEffect(() => {
    if (state.success) router.push("/admin/staff");
  }, [state.success, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.email}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Họ tên *</Label>
            <Input
              id="full_name"
              name="full_name"
              required
              maxLength={100}
              defaultValue={user.full_name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input
              id="phone"
              name="phone"
              maxLength={20}
              defaultValue={user.phone ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Vai trò *</Label>
            <Select name="role" defaultValue={user.role} required>
              <SelectTrigger>
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Quản trị</SelectItem>
                <SelectItem value="practitioner">Thầy thuốc</SelectItem>
                <SelectItem value="dispenser">Nhân viên bốc thuốc</SelectItem>
                <SelectItem value="cashier">Thu ngân</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              Mật khẩu mới (để trống nếu không đổi)
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Ít nhất 6 ký tự"
            />
          </div>

          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu…" : "Lưu thay đổi"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/staff">Hủy</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
