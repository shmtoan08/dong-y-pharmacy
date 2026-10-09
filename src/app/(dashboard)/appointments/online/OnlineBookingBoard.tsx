"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  confirmBooking, rejectBooking, cancelBooking, markContacted,
  type OnlineBooking,
} from "@/features/appointments/online";
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
  initialBookings, activeTab,
}: {
  initialBookings: OnlineBooking[];
  activeTab: string;
}) {
  const router = useRouter();
  const [info, setInfo] = useState<{ title: string; desc: string } | null>(null);
  const showInfo = (title: string, desc: string) => setInfo({ title, desc });
  const [loading, setLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [contactId, setContactId] = useState<string | null>(null);
  const [contactNote, setContactNote] = useState("");

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

  function fmtDateTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  }

  return (
    <div className="space-y-4">
      <InfoModal open={info !== null} onOpenChange={(o) => !o && setInfo(null)}
        title={info?.title ?? ""} description={info?.desc ?? ""} />

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {TABS.map((t) => (
          <Link key={t.key} href={`/appointments/online?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === t.key
                ? "border-b-2 border-emerald-600 text-emerald-700"
                : "text-stone-500"
            }`}>
            {t.label}
          </Link>
        ))}
      </div>

      {/* Danh sách */}
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
                    </p>
                    <p className="text-sm text-stone-500">
                      {b.booking_type === "queue"
                        ? `Số thứ tự: ${b.queue_number} • Ngày ${b.queue_date}`
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
                    {(b.status === "scheduled" || b.status === "confirmed") && (
                      <>
                        <Button size="sm" variant="outline" disabled={loading === b.id}
                          onClick={() => { setContactId(b.id); setContactNote(""); }}>
                          📞 Liên hệ
                        </Button>
                        <Button size="sm" variant="outline" disabled={loading === b.id}
                          onClick={() => {
                            const r = prompt("Lý do hủy:");
                            if (r !== null) run(b.id, () => cancelBooking(b.id, r), "Đã hủy lịch");
                          }}>
                          Hủy
                        </Button>
                      </>
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
    </div>
  );
}
