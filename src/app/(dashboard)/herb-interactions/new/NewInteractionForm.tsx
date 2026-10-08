"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoModal } from "@/components/shared/InfoModal";
import { BackButton } from "@/components/shared/BackButton";
import { createInteraction } from "@/features/prescriptions/actions";

export function NewInteractionForm({
  herbs,
}: {
  herbs: { id: string; name_common: string; code: string }[];
}) {
  const router = useRouter();
  const [herbA, setHerbA] = useState("");
  const [herbB, setHerbB] = useState("");
  const [severity, setSeverity] = useState<"cam_ky" | "can_trong">("cam_ky");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterHerbs = (q: string) => {
    const s = q.toLowerCase().trim();
    if (!s) return herbs.slice(0, 50);
    return herbs
      .filter(
        (h) =>
          h.name_common.toLowerCase().includes(s) ||
          h.code.toLowerCase().includes(s),
      )
      .slice(0, 50);
  };

  const onSubmit = async () => {
    if (!herbA || !herbB) {
      setError("Vui lòng chọn đủ 2 vị thuốc.");
      return;
    }
    setBusy(true);
    const res = await createInteraction(herbA, herbB, severity, description, source);
    setBusy(false);
    if (res.error) setError(res.error);
    else router.push("/herb-interactions");
  };

  const herbName = (id: string) => herbs.find((h) => h.id === id)?.name_common ?? "";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vị thuốc A {herbA && `— ${herbName(herbA)}`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              value={searchA}
              onChange={(e) => setSearchA(e.target.value)}
              placeholder="Tìm vị thuốc A..."
            />
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {filterHerbs(searchA).map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setHerbA(h.id)}
                  className={`w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-stone-100 ${
                    herbA === h.id ? "bg-emerald-50 font-medium text-emerald-800" : ""
                  }`}
                >
                  {h.name_common} <span className="font-mono text-xs text-stone-500">{h.code}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vị thuốc B {herbB && `— ${herbName(herbB)}`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              value={searchB}
              onChange={(e) => setSearchB(e.target.value)}
              placeholder="Tìm vị thuốc B..."
            />
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {filterHerbs(searchB).map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setHerbB(h.id)}
                  className={`w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-stone-100 ${
                    herbB === h.id ? "bg-emerald-50 font-medium text-emerald-800" : ""
                  }`}
                >
                  {h.name_common} <span className="font-mono text-xs text-stone-500">{h.code}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="space-y-1.5">
            <Label>Mức độ</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as "cam_ky" | "can_trong")}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cam_ky">Cấm kỵ (thập bát phản...)</SelectItem>
                <SelectItem value="can_trong">Cẩn trọng</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Mô tả</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Thập bát phản — Cam thảo phản Đại kích..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nguồn tham khảo</Label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="VD: Sách..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <BackButton href="/herb-interactions" />
        <Button
          onClick={onSubmit}
          disabled={busy || !herbA || !herbB}
          className="bg-emerald-800 hover:bg-emerald-900"
        >
          {busy ? "Đang lưu..." : "Lưu cặp tương kỵ"}
        </Button>
      </div>

      <InfoModal
        open={error !== null}
        onOpenChange={(o) => !o && setError(null)}
        title={error ?? ""}
      />
    </div>
  );
}
