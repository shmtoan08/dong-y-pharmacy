"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  getMappings,
  scanHerbMappings,
  confirmMapping,
  rejectMapping,
  searchHerbs,
  type MappingRow,
  type Herb,
} from "@/features/herbs/actions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  confirmed: "Đã duyệt",
  rejected: "Từ chối",
};

export function MigrateClient({
  initialMappings,
  stats,
}: {
  initialMappings: MappingRow[];
  stats: { pending: number; confirmed: number; rejected: number; total: number };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mappings, setMappings] = useState(initialMappings);
  const [filter, setFilter] = useState("pending");
  // herbId đang chọn cho từng mapping (khi cần đổi sang vị khác)
  const [selectedHerb, setSelectedHerb] = useState<Record<string, string>>({});
  const [searchQ, setSearchQ] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, Herb[]>>({});
  const [notice, setNotice] = useState<string | undefined>();
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const doScan = () => {
    setNotice(undefined);
    startTransition(async () => {
      const r = await scanHerbMappings();
      setNotice(`Đã quét xong: ${r.scanned} tên, thêm ${r.newMappings} mapping mới.`);
      const fresh = await getMappings();
      setMappings(fresh);
      router.refresh();
    });
  };

  const doSearch = async (mappingId: string) => {
    const q = searchQ[mappingId]?.trim();
    if (!q) return;
    const results = await searchHerbs(q, 8);
    setSearchResults((s) => ({ ...s, [mappingId]: results }));
  };

  const doConfirm = (m: MappingRow) => {
    const herbId = selectedHerb[m.id] || m.herb_id;
    if (!herbId) {
      setNotice("Chưa chọn vị thuốc để map.");
      return;
    }
    startTransition(async () => {
      const r = await confirmMapping(m.id, herbId);
      if (r.error) setNotice(r.error);
      else {
        setMappings((ms) => ms.map((x) => (x.id === m.id ? { ...x, status: "confirmed", herb_id: herbId } : x)));
        router.refresh();
      }
    });
  };

  const doReject = (m: MappingRow) => {
    startTransition(async () => {
      await rejectMapping(m.id, rejectReason[m.id]?.trim() || undefined);
      setMappings((ms) => ms.map((x) => (x.id === m.id ? { ...x, status: "rejected" } : x)));
      setRejectingId(null);
      router.refresh();
    });
  };

  const visible = mappings.filter((m) => m.status === filter);

  return (
    <div className="space-y-4">
      {notice && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      )}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Chuẩn hóa tên vị thuốc</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-600">
            Quét tên vị thuốc dạng text tự do trong bài thuốc mẫu và đơn thuốc,
            gợi ý map sang danh mục. Thầy thuốc duyệt từng cái.
            Đơn thuốc cũ không bị sửa — chỉ dữ liệu mới mới dùng danh mục.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={doScan} disabled={isPending} size="sm"
              className="bg-emerald-800 hover:bg-emerald-900">
              {isPending ? "Đang quét..." : "Quét tên vị thuốc"}
            </Button>
            <div className="flex gap-2 text-sm">
              <Badge variant={filter === "pending" ? "default" : "outline"}
                className="cursor-pointer" onClick={() => setFilter("pending")}>
                Chờ duyệt: {stats.pending}
              </Badge>
              <Badge variant={filter === "confirmed" ? "default" : "outline"}
                className="cursor-pointer" onClick={() => setFilter("confirmed")}>
                Đã duyệt: {stats.confirmed}
              </Badge>
              <Badge variant={filter === "rejected" ? "default" : "outline"}
                className="cursor-pointer" onClick={() => setFilter("rejected")}>
                Từ chối: {stats.rejected}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {visible.length === 0 ? (
        <p className="text-center text-sm text-stone-500">
          {filter === "pending" ? "Không còn tên nào chờ duyệt. Bấm \"Quét tên vị thuốc\" để quét." : "Trống."}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((m) => (
            <Card key={m.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-stone-900">"{m.source_text}"</p>
                  <Badge variant="outline">{STATUS_LABEL[m.status]}</Badge>
                </div>

                {m.herb_id && m.herb_name ? (
                  <p className="text-sm text-stone-600">
                    Gợi ý: <span className="font-medium text-emerald-800">{m.herb_name}</span>
                    <span className="ml-1 font-mono text-xs text-stone-500">{m.herb_code}</span>
                    {m.confidence && <span className="ml-2 text-xs text-stone-400">độ tin cậy {m.confidence}</span>}
                  </p>
                ) : (
                  <p className="text-sm text-amber-700">Chưa tìm thấy vị thuốc khớp trong danh mục.</p>
                )}

                {m.status === "pending" && (
                  <>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Tìm vị thuốc khác để map..."
                        className="max-w-xs"
                        value={searchQ[m.id] ?? ""}
                        onChange={(e) => setSearchQ((s) => ({ ...s, [m.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), doSearch(m.id))}
                      />
                      <Button variant="outline" size="sm" onClick={() => doSearch(m.id)}>Tìm</Button>
                    </div>
                    {(searchResults[m.id] ?? []).length > 0 && (
                      <ul className="max-w-md divide-y divide-stone-100 rounded-md border border-stone-200">
                        {searchResults[m.id].map((h) => (
                          <li key={h.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedHerb((s) => ({ ...s, [m.id]: h.id }))}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-stone-50 ${
                                (selectedHerb[m.id] || m.herb_id) === h.id ? "bg-emerald-50 font-medium" : ""
                              }`}
                            >
                              {h.name_common} <span className="font-mono text-xs text-stone-500">{h.code}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => doConfirm(m)} disabled={isPending}
                        className="bg-emerald-800 hover:bg-emerald-900">
                        Duyệt {selectedHerb[m.id] ? "(vị đã chọn)" : m.herb_name ? `(giữ ${m.herb_name})` : ""}
                      </Button>
                      {rejectingId === m.id ? (
                        <div className="flex flex-1 gap-2">
                          <Input
                            placeholder="Lý do từ chối (không bắt buộc)..."
                            value={rejectReason[m.id] ?? ""}
                            onChange={(e) => setRejectReason((s) => ({ ...s, [m.id]: e.target.value }))}
                          />
                          <Button size="sm" variant="destructive" onClick={() => doReject(m)} disabled={isPending}>
                            Xác nhận
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)}>
                            Hủy
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setRejectingId(m.id)} disabled={isPending}
                          className="text-red-600">
                          Từ chối
                        </Button>
                      )}
                    </div>
                  </>
                )}
                {m.status === "rejected" && m.rejection_reason && (
                  <p className="text-xs text-stone-500">Lý do: {m.rejection_reason}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
