"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoModal } from "@/components/shared/InfoModal";
import { PERMISSIONS } from "@/lib/permissions";
import { updateRolePermissions } from "@/features/admin/permissions";

const ROLES = [
  { value: "practitioner", label: "Bác sĩ" },
  { value: "dispenser", label: "Dược sĩ" },
];

export function RolesMatrix({
  initial,
}: {
  initial: Record<string, Record<string, boolean>>;
}) {
  const router = useRouter();
  const [grants, setGrants] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = (role: string, key: string) => {
    setGrants((g) => ({
      ...g,
      [role]: { ...g[role], [key]: !g[role][key] },
    }));
  };

  const onSave = async (role: string) => {
    setSaving(role);
    const res = await updateRolePermissions(role, grants[role]);
    setSaving(null);
    if (res.error) setError(res.error);
    else router.refresh();
  };

  // Nhóm quyền theo group
  const groups: Record<string, { key: string; label: string; group: string }[]> = {};
  for (const p of PERMISSIONS) {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push({ key: p.key, label: p.label, group: p.group });
  }

  return (
    <div className="space-y-4">
      {ROLES.map((r) => (
        <Card key={r.value}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">👤 {r.label}</CardTitle>
            <Button size="sm" onClick={() => onSave(r.value)} disabled={saving === r.value}
              className="bg-emerald-800 hover:bg-emerald-900">
              {saving === r.value ? "Đang lưu..." : "Lưu quyền"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(groups).map(([group, perms]) => (
                <div key={group}>
                  <p className="mb-2 text-sm font-medium text-stone-700">{group}</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {perms.map((p) => (
                      <label key={p.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 hover:bg-stone-50">
                        <Checkbox
                          checked={grants[r.value]?.[p.key] ?? false}
                          onCheckedChange={() => toggle(r.value, p.key)}
                        />
                        <span className="text-sm">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      <p className="text-sm text-stone-500">
        ℹ️ Admin luôn có mọi quyền (không cần cấu hình).
      </p>
      <InfoModal open={error !== null} onOpenChange={(o) => !o && setError(null)} title={error ?? ""} />
    </div>
  );
}
