"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  confirmBooking, rejectBooking, cancelBooking, markContacted, checkInOnlineBooking,
  type OnlineBooking,
} from "@/features/appointments/online";
import { BookingTimeline } from "./BookingTimeline";
import { InfoModal } from "@/components/shared/InfoModal";

const TABS = [
  { key: "pending", label: "Chờ xác nhận" },
  { key: "confirmed", label: "Đã xác nhận" },
  { key: "today", label: "Hôm nay" },
  { key: "all", label: "Tất cả" },
] as const;

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  scheduled: { text: "Chờ xác nhận", color: "bg-amber-100 text-amber-800" },
  confirmed: { text: "Đã xác nhận", color: "bg-emerald-100 text-emerald-800" },
  checked_in: { text: "Đã đến", color: "bg-blue-100 text-blue-800" },
  completed: { text: "Hoàn thành", color: "bg-stone-200 text-stone-600" },
  rejected: { text: "Từ chối", color: "bg-red-100 text-red-800" },
  cancelled: { text: "Đã hủy", color: "bg-stone-200 text-stone-500" },
};

export function OnlineBookingBoard({
  initialBookings, activeTab, initialSearch,
}: {
  initialBookings: OnlineBooking[];
  activeTab: string;
  initialSearch: string;
}) {
  const router = useRouter();
  const [info, setInfo] = useState<{ title: string; desc: string } | null>(null);
  const showInfo = (title: string, desc: string) => setInfo({ title, desc });
  const [loading, setLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [contactId, setContactId] = useState<string | null>(null);
  const [contactNote, setContactNote] = useState("");
  const [search, setSearch] = useState(initialSearch);
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");

  async function run(id: string, fn: () => Promise<void>, okMsg: string) {
    setLoading(id);
    try {
      await fn();
      showInfo("Thành công", okMsg);
      router.refresh();
    } catch (e: any) {
      showInfo("Lỗi", e.message || "Thao tác thất bại");
    } finally {
      setLoading(null);
    }
  }

  async function handleCheckIn(id: string) {
    setLoading(id);
    try {
      const r = await checkInOnlineBooking(id);
      if (r.error) {
        showInfo("Lỗi", r.error);
      } else {
        showInfo("Thành công", "Đã tiếp đón, chuyển sang phòng khám");
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  function doSearch() {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", activeTab);
    if (search.trim()) params.set("q", search.trim());
    else params.delete("q");
    router.push(`/appointments/online?${params.toString()}`);
  }

  function fmtDateVN(d: string | Date | null): string {
    if (!d) return "";
    // queue_date co the la Date object hoac string "2026-10-09"
    const dt = d instanceof Date ? d : new Date(d.slice(0, 10) + "T00:00:00");
    const day = String(dt.getDate()).padStart(2, "0");
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    return `${day}/${m}/${dt.getFullYear()}`;
  }

  function fmtDateTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  }

  return (
    <div className="space-y-4">
      <InfoModal open={info !== null} onOpenChange={(o) => !o && setInfo(null)}
        title={info?.title ?? ""} description={info?.desc ?? ""} />

      {/* Ô tìm kiếm */}
      <div className="flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
          placeholder="Tìm theo SĐT, tên bệnh nhân, mã lịch..."
          className="flex-1" />
        <Button onClick={doSearch}>🔍 Tìm</Button>
        {initialSearch && (
          <Button variant="outline" onClick={() => { setSearch(""); router.push(`/appointments/online?tab=${activeTab}`); }}>
            ✕
          </Button>
        )}
      </div>

      {/* Tabs - cuộn ngang trên mobile */}
      <div className="flex gap-2 overflow-x-auto border-b whitespace-nowrap">
        {TABS.map((t) => (
          <Link key={t.key} href={`/appointments/online?tab=${t.key}${initialSearch ? `&q=${encodeURIComponent(initialSearch)}` : ""}`}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === t.key
                ? "border-b-2 border-emerald-600 text-emerald-700"
                : "text-stone-500"
            }`}>
            {t.label}
          </Link>
        ))}
      </div>

      {/* Toggle List / Timeline */}
      <div className="flex w-fit gap-1 rounded-lg bg-stone-100 p-1">
        <button
          onClick={() => setViewMode("list")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            viewMode === "list" ? "bg-white text-stone-900 shadow" : "text-stone-500"
          }`}>
          📋 Danh sách
        </button>
        <button
          onClick={() => setViewMode("timeline")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            viewMode === "timeline" ? "bg-white text-stone-900 shadow" : "text-stone-500"
          }`}>
          🕐 Timeline
        </button>
      </div>

      {/* Danh sách / Timeline */}
      {viewMode === "timeline" ? (
        <BookingTimeline bookings={initialBookings} />
      ) : (
      <div className="space-y-2">
        {initialBookings.map((b) => {
          const st = STATUS_LABEL[b.status] || STATUS_LABEL.scheduled;
          return (
            <Card key={b.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold">{b.appointment_code}</span>
                      <Badge className={st.color}>{st.text}</Badge>
                      <span className="text-xs text-stone-400">
                        {b.booking_type === "queue" ? "🎫 Bốc số" : "📅 Đặt trước"}
                      </span>
                      {b.contacted_at && <span className="text-xs text-blue-600">📞 Đã liên hệ</span>}
                    </div>
                    <p className="mt-1 font-medium">
                      {b.patient_name}
                      <a href={`tel:${b.phone}`} className="ml-2 text-sm text-emerald-700 underline">
                        {b.phone}
                      </a>
                      <span className="ml-2 text-xs text-stone-400">{b.patient_code}</span>
                      {(b.birth_year || b.gender) && (
                        <span className="ml-2 text-xs text-stone-400">
                          {b.birth_year ? `NS: ${b.birth_year}` : ""}{b.birth_year && b.gender ? " • " : ""}{b.gender === "male" ? "Nam" : b.gender === "female" ? "Nữ" : ""}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-stone-500">
                      {b.booking_type === "queue"
                        ? `Số thứ tự: ${b.queue_number} • Ngày ${fmtDateVN(b.queue_date)}`
                        : fmtDateTime(b.scheduled_at)}
                      {b.doctor_name && ` • BS: ${b.doctor_name}`}
                    </p>
                    {b.symptom && (
                      <p className="mt-1 truncate text-sm text-stone-400" title={b.symptom}>
                        💬 {b.symptom}
                      </p>
                    )}
                    {b.reject_reason && (
                      <p className="mt-1 text-sm text-red-600">Lý do: {b.reject_reason}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {b.status === "scheduled" && (
                      <>
                        <Button size="sm" disabled={loading === b.id}
                          onClick={() => run(b.id, () => confirmBooking(b.id), "Đã xác nhận lịch")}>
                          ✅ Xác nhận
                        </Button>
                        <Button size="sm" variant="outline" disabled={loading === b.id}
                          onClick={() => { setRejectId(b.id); setRejectReason(""); }}>
                          ❌ Từ chối
                        </Button>
                      </>
                    )}
                    {(b.status === "confirmed" || (b.status === "scheduled" && b.booking_type === "queue")) && (
                      <Button size="sm" disabled={loading === b.id}
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleCheckIn(b.id)}>
                        🩺 Tiếp đón
                      </Button>
                    )}
                    {(b.status === "scheduled" || b.status === "confirmed") && (
                      <details className="relative">
                        <summary className="cursor-pointer list-none rounded-md border border-stone-300 px-3 py-1.5 text-sm">
                          ⋯
                        </summary>
                        <div className="absolute right-0 z-10 mt-1 w-40 rounded-md border bg-white shadow-lg">
                          <button className="block w-full px-3 py-2 text-left text-sm hover:bg-stone-100"
                            onClick={() => { setContactId(b.id); setContactNote(""); }}>
                            📞 Đánh dấu liên hệ
                          </button>
                          <button className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-stone-100"
                            onClick={() => {
                              const r = prompt("Lý do hủy:");
                              if (r !== null) run(b.id, () => cancelBooking(b.id, r), "Đã hủy lịch");
                            }}>
                            Hủy lịch
                          </button>
                        </div>
                      </details>
                    )}
                  </div>
                </div>

                {/* Form từ chối */}
                {rejectId === b.id && (
                  <div className="mt-3 rounded-lg bg-red-50 p-3">
                    <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Lý do từ chối (hiện cho bệnh nhân)" className="mb-2" />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={!rejectReason.trim() || loading === b.id}
                        onClick={() => {
                          run(b.id, () => rejectBooking(b.id, rejectReason), "Đã từ chối lịch");
                          setRejectId(null);
                        }}>
                        Xác nhận từ chối
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectId(null)}>
                        Đóng
                      </Button>
                    </div>
                  </div>
                )}

                {/* Form liên hệ */}
                {contactId === b.id && (
                  <div className="mt-3 rounded-lg bg-blue-50 p-3">
                    <Input value={contactNote} onChange={(e) => setContactNote(e.target.value)}
                      placeholder="Ghi chú cuộc gọi (không bắt buộc)" className="mb-2" />
                    <div className="flex gap-2">
                      <Button size="sm"
                        onClick={() => {
                          run(b.id, () => markContacted(b.id, contactNote), "Đã đánh dấu liên hệ");
                          setContactId(null);
                        }}>
                        Đánh dấu đã liên hệ
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setContactId(null)}>
                        Đóng
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {initialBookings.length === 0 && (
          <p className="py-8 text-center text-stone-400">Không có lịch nào</p>
        )}
      </div>
      )}
    </div>
  );
}
