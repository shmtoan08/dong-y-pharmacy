"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { InfoModal } from "@/components/shared/InfoModal";
import { CalendarClock } from "lucide-react";
import { rescheduleAppointment } from "@/features/appointments/actions";

/** Nút dời lịch: đổi ngày giờ hẹn */
export function RescheduleButton({
  appointmentId,
  currentAt,
}: {
  appointmentId: string;
  currentAt: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const d = new Date(currentAt);
  const [date, setDate] = useState(d.toISOString().slice(0, 10));
  const [time, setTime] = useState(
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  );
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!date || !time) {
      setInfo("Chưa chọn ngày giờ mới.");
      return;
    }
    setBusy(true);
    const res = await rescheduleAppointment(appointmentId, `${date}T${time}:00+07:00`);
    setBusy(false);
    if (res.error) setInfo(res.error);
    else {
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      <Tooltip label="Dời lịch">
        <Button variant="ghost" size="icon" className="h-10 w-10 md:h-9 md:w-9" onClick={() => setOpen(true)}>
          <CalendarClock className="h-4 w-4" />
        </Button>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Dời lịch hẹn</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ngày mới *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Giờ mới *</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Hủy</Button>
            <Button className="bg-emerald-800 hover:bg-emerald-900" onClick={onSubmit} disabled={busy}>
              {busy ? "Đang lưu..." : "Xác nhận dời lịch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoModal open={info !== null} onOpenChange={(o) => !o && setInfo(null)} title={info ?? ""} />
    </>
  );
}
