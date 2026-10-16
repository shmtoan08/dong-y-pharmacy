"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoModal } from "@/components/shared/InfoModal";
import { Plus, Trash2, CheckSquare } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions";
import { updateRolePermissions } from "@/features/admin/permissions";
import { createRole, deleteRole, type RoleDef } from "@/features/admin/roles";
import { cn } from "@/lib/utils";

export function RolesManager({
  roles,
  initialPermissions,
}: {
  roles: RoleDef[];
  initialPermissions: Record<string, Record<string, boolean>>;
}) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(roles[0]?.code ?? "");
  const [grants, setGrants] = useState(initialPermissions);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const role = roles.find((r) => r.code === selectedRole);
  const roleGrants = grants[selectedRole] ?? {};

  const toggle = (key: string) => {
    setGrants((g) => ({
      ...g,
      [selectedRole]: { ...g[selectedRole], [key]: !g[selectedRole]?.[key] },
    }));
    setDirty(true);
  };

  const toggleAll = (groupKeys: string[], checked: boolean) => {
    setGrants((g) => {
      const updated = { ...g[selectedRole] };
      for (const k of groupKeys) updated[k] = checked;
      return { ...g, [selectedRole]: updated };
    });
    setDirty(true);
  };

  const onSave = async () => {
    setSaving(true);
    const res = await updateRolePermissions(selectedRole, roleGrants);
    setSaving(false);
    if (res.error) setError(res.error);
    else {
      setDirty(false);
      router.refresh();
    }
  };

  const onCreateRole = async () => {
    const res = await createRole(newCode, newLabel, newDesc);
    if (res.error) setError(res.error);
    else {
      setShowAdd(false);
      setNewCode(""); setNewLabel(""); setNewDesc("");
      router.refresh();
    }
  };

  const onDeleteRole = async () => {
    if (!role || role.is_system) return;
    if (!confirm(`Xóa vai trò "${role.label}"?`)) return;
    const res = await deleteRole(role.code);
    if (res.error) setError(res.error);
    else {
      const remaining = roles.filter((r) => r.code !== role.code);
      setSelectedRole(remaining[0]?.code ?? "");
      router.refresh();
    }
  };

  // Nhóm quyền
  const groups: Record<string, { key: string; label: string }[]> = {};
  for (const p of PERMISSIONS) {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push({ key: p.key, label: p.label });
  }

  return (
    <div className="space-y-4">
      {/* Mobile: dropdown chọn vai trò */}
      <div className="md:hidden">
        <Label className="text-xs">Chọn vai trò</Label>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="mt-1 h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.code} value={r.code}>
                {r.label} ({r.staff_count} NV)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        {/* Cột trái: danh sách vai trò */}
        <div className="hidden space-y-2 md:block">
          {roles.map((r) => (
            <button
              key={r.code}
              type="button"
              onClick={() => { setSelectedRole(r.code); setDirty(false); }}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition-colors",
                selectedRole === r.code
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-stone-200 bg-white hover:bg-stone-50"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.label}</span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                  {r.staff_count} NV
                </span>
              </div>
              {r.description && (
                <p className="mt-1 text-xs text-stone-500">{r.description}</p>
              )}
              {r.is_system && (
                <span className="mt-1 inline-block rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500">
                  Hệ thống
                </span>
              )}
            </button>
          ))}
          <Button variant="outline" className="w-full" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-4 w-4" /> Thêm vai trò
          </Button>
        </div>

        {/* Cột phải: ma trận quyền */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Đang cấu hình: {role?.label}
                </CardTitle>
                <p className="text-xs text-stone-500">
                  {role?.description} • {role?.staff_count} nhân viên
                </p>
              </div>
              {role && !role.is_system && (
                <Button variant="ghost" size="sm" onClick={onDeleteRole}
                  className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pb-20 md:pb-6">
            {role?.code === "admin" ? (
              <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
                ✅ Quản trị viên luôn có mọi quyền trong hệ thống.
              </p>
            ) : (
              Object.entries(groups).map(([group, perms]) => {
                const keys = perms.map((p) => p.key);
                const allChecked = keys.every((k) => roleGrants[k]);
                return (
                  <div key={group} className="rounded-lg border border-stone-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-medium text-stone-700">{group}</p>
                      <button
                        type="button"
                        onClick={() => toggleAll(keys, !allChecked)}
                        className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800"
                      >
                        <CheckSquare className="h-3.5 w-3.5" />
                        {allChecked ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {perms.map((p) => (
                        <label
                          key={p.key}
                          className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-stone-100 px-3 py-2 hover:bg-stone-50"
                        >
                          <Checkbox
                            checked={roleGrants[p.key] ?? false}
                            onCheckedChange={() => toggle(p.key)}
                            className="h-5 w-5"
                          />
                          <span className="text-sm">{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sticky save bar */}
      {dirty && role?.code !== "admin" && (
        <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-stone-200 bg-white p-3 shadow-lg md:sticky md:bottom-4 md:rounded-lg md:border">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <p className="text-sm text-stone-600">
              Có thay đổi chưa lưu cho <span className="font-medium">{role?.label}</span>
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setGrants(initialPermissions); setDirty(false); }}>
                Hủy
              </Button>
              <Button size="sm" onClick={onSave} disabled={saving}
                className="bg-emerald-800 hover:bg-emerald-900">
                {saving ? "Đang lưu..." : "💾 Lưu thay đổi"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog thêm vai trò */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Thêm vai trò mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Mã vai trò *</Label>
              <Input value={newCode} onChange={(e) => setNewCode(e.target.value)}
                placeholder="vd: nurse, accountant" />
              <p className="text-xs text-stone-500">Chữ thường, không dấu, không khoảng trắng</p>
            </div>
            <div className="space-y-1.5">
              <Label>Tên hiển thị *</Label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
                placeholder="vd: Y tá, Kế toán" />
            </div>
            <div className="space-y-1.5">
              <Label>Mô tả</Label>
              <Textarea rows={2} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Hủy</Button>
            <Button onClick={onCreateRole} className="bg-emerald-800 hover:bg-emerald-900">
              Tạo vai trò
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoModal open={error !== null} onOpenChange={(o) => !o && setError(null)} title={error ?? ""} />
    </div>
  );
}
