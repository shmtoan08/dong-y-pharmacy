"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoModal } from "@/components/shared/InfoModal";
import {
  createInteraction,
  type InteractionInput,
} from "@/features/prescriptions/actions";
import { CATEGORY_LABEL, CONTRA_LABEL } from "@/features/prescriptions/interactionConstants";
import type { InteractionCategory } from "@/features/prescriptions/interactionConstants";

const CONTRA_KEYS = Object.keys(CONTRA_LABEL);

export function InteractionForm({
  herbs,
  initial,
  interactionId,
}: {
  herbs: { id: string; name_common: string; code: string }[];
  initial?: InteractionInput & { herbAName?: string; herbBName?: string };
  interactionId?: string;
}) {
  const router = useRouter();
  const [herbA, setHerbA] = useState(initial?.herbAId ?? "");
  const [herbB, setHerbB] = useState(initial?.herbBId ?? "");
  const [severity, setSeverity] = useState<"cam_ky" | "can_trong">(initial?.severity ?? "cam_ky");
  const [category, setCategory] = useState<InteractionCategory>(initial?.category ?? "thap_bat_phan");
  const [contra, setContra] = useState<string[]>(initial?.contraindicatedFor ?? []);
  const [symptoms, setSymptoms] = useState(initial?.symptoms ?? "");
  const [antidote, setAntidote] = useState(initial?.antidote ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterHerbs = (q: string) => {
    const s = q.toLowerCase().trim();
    if (!s) return herbs.slice(0, 50);
    return herbs
      .filter(
        (h) => h.name_common.toLowerCase().includes(s) || h.code.toLowerCase().includes(s),
      )
      .slice(0, 50);
  };

  const toggleContra = (k: string) => {
    setContra((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  const herbName = (id: string) => herbs.find((h) => h.id === id)?.name_common ?? "";

  const onSubmit = async () => {
    if (!herbA || !herbB) {
      setError("Vui lòng chọn đủ 2 vị thuốc.");
      return;
    }
    const input: InteractionInput = {
      herbAId: herbA,
      herbBId: herbB,
      severity,
      category,
      contraindicatedFor: contra,
      symptoms,
      antidote,
      description,
      source,
    };
    setBusy(true);
    const res = interactionId
      ? await (await import("@/features/prescriptions/actions")).updateInteraction(interactionId, input)
      : await createInteraction(input);
    setBusy(false);
    if (res.error) setError(res.error);
    else router.push("/herb-interactions");
  };

  return (
    <div className="space-y-4">
      {/* Phần 1: Chọn cặp dược liệu */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Chọn cặp dược liệu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Vị thuốc A * {herbA && `— ${herbName(herbA)}`}</Label>
              <Input
                value={searchA}
                onChange={(e) => setSearchA(e.target.value)}
                placeholder="Tìm vị thuốc A..."
              />
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-stone-100 p-1">
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
            </div>
            <div className="space-y-2">
              <Label>Vị thuốc B * {herbB && `— ${herbName(herbB)}`}</Label>
              <Input
                value={searchB}
                onChange={(e) => setSearchB(e.target.value)}
                placeholder="Tìm vị thuốc B..."
              />
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-stone-100 p-1">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phần 2: Phân loại & Mức độ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">2. Phân loại chuyên môn & Mức độ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Phân loại YHCT *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as InteractionCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mức độ cảnh báo *</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as "cam_ky" | "can_trong")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cam_ky">🔴 Cấm kỵ (chống chỉ định tuyệt đối)</SelectItem>
                  <SelectItem value="can_trong">🟡 Cẩn trọng (cân nhắc liều lượng)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Đối tượng chống chỉ định</Label>
            <div className="flex flex-wrap gap-4">
              {CONTRA_KEYS.map((k) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={contra.includes(k)} onCheckedChange={() => toggleContra(k)} />
                  {CONTRA_LABEL[k]}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phần 3: Mô tả lâm sàng */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">3. Mô tả lâm sàng & Nguồn tài liệu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Hậu quả & Triệu chứng ngộ độc / Giảm tác dụng</Label>
            <Textarea
              rows={2}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="VD: Sinh độc tính mạnh, tổn thương tạng phủ..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Biện pháp xử lý / Vị thuốc giải độc (nếu có)</Label>
            <Input
              value={antidote}
              onChange={(e) => setAntidote(e.target.value)}
              placeholder="VD: Cam thảo, Đậu xanh..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mô tả thêm</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giải thích thêm về tương kỵ..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nguồn tài liệu / Dược điển</Label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="VD: Dược điển Việt Nam V, Hải Thượng Y Tông Tâm Lĩnh..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          onClick={onSubmit}
          disabled={busy || !herbA || !herbB}
          className="bg-emerald-800 hover:bg-emerald-900"
        >
          {busy ? "Đang lưu..." : interactionId ? "Cập nhật" : "Lưu cặp tương kỵ"}
        </Button>
      </div>

      {interactionId && (
        <p className="text-xs text-amber-700">
          Lưu ý: Sửa cặp tương kỵ sẽ đưa về trạng thái "Chưa duyệt", cần duyệt lại.
        </p>
      )}

      <InfoModal
        open={error !== null}
        onOpenChange={(o) => !o && setError(null)}
        title={error ?? ""}
      />
    </div>
  );
}
