"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { callNextNumber, completeQueueNumber, cancelQueueNumber, type QueueItem } from "@/features/appointments/queue";

export function QueueBoard({ initialQueue }: { initialQueue: QueueItem[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<number | null>(null);

  const current = initialQueue.find((q) => q.status === "checked_in");
  const waiting = initialQueue.filter((q) => q.status === "scheduled");

  async function handle(num: number | null, action: "call" | "complete" | "cancel", id?: string) {
    setLoading(num);
    try {
      if (action === "call" && num) await callNextNumber(num);
      else if (action === "complete" && num) await completeQueueNumber(num);
      else if (action === "cancel" && id) await cancelQueueNumber(id);
      router.refresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Số đang khám */}
      <Card className="border-emerald-600">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-stone-500">ĐANG KHÁM</p>
          {current ? (
            <>
              <p className="text-6xl font-bold text-emerald-700">{current.queue_number}</p>
              <p className="mt-1">{current.patient_name} • {current.phone}</p>
              <Button
                className="mt-3" disabled={loading === current.queue_number}
                onClick={() => handle(current.queue_number, "complete")}
              >
                ✅ Hoàn tất lượt này
              </Button>
            </>
          ) : (
            <p className="py-4 text-stone-400">Chưa có bệnh nhân đang khám</p>
          )}
        </CardContent>
      </Card>

      {/* Hàng chờ */}
      <div>
        <h2 className="mb-2 font-semibold">Đang chờ ({waiting.length})</h2>
        <div className="space-y-2">
          {waiting.map((q) => (
            <Card key={q.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 font-bold">
                    {q.queue_number}
                  </span>
                  <div>
                    <p className="font-medium">{q.patient_name}</p>
                    <p className="text-sm text-stone-500">{q.phone} • {q.appointment_code}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={loading === q.queue_number}
                    onClick={() => handle(q.queue_number, "call")}>
                    📢 Gọi số
                  </Button>
                  <Button size="sm" variant="outline" disabled={loading === q.queue_number}
                    onClick={() => handle(q.queue_number, "cancel", q.id)}>
                    Hủy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {waiting.length === 0 && (
            <p className="py-4 text-center text-stone-400">Không có bệnh nhân chờ</p>
          )}
        </div>
      </div>
    </div>
  );
}
