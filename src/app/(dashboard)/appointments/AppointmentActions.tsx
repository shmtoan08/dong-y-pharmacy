"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { InfoModal } from "@/components/shared/InfoModal";
import { UserCheck, Stethoscope, X, UserX } from "lucide-react";
import Link from "next/link";
import {
  checkInAppointment,
  createVisitFromAppointment,
  cancelAppointment,
  markNoShow,
  type AppointmentRow,
  type AppointmentStatus,
} from "@/features/appointments/actions";

const STATUS: Record<AppointmentStatus, { label: string; cls: string }> = {
  scheduled: { label: "Đã đặt", cls: "bg-blue-100 text-blue-800" },
  confirmed: { label: "Đã xác nhận", cls: "bg-indigo-100 text-indigo-800" },
  checked_in: { label: "Đã tiếp đón", cls: "bg-amber-100 text-amber-800" },
  completed: { label: "Hoàn thành", cls: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Đã hủy", cls: "bg-stone-200 text-stone-600" },
  no_show: { label: "Không đến", cls: "bg-red-100 text-red-800" },
};

export function AppointmentRowActions({
  appt,
  canManage,
}: {
  appt: AppointmentRow;
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const run = async (fn: () => Promise<{ error?: string }>) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.error) setInfo(res.error);
    else router.refresh();
  };

  const onCreateVisit = async () => {
    setBusy(true);
    const res = await createVisitFromAppointment(appt.id);
    setBusy(false);
    if (res.error) setInfo(res.error);
    else if (res.visitId) router.push(`/prescriptions/new?visitId=${res.visitId}`);
    else router.refresh();
  };

  if (!canManage) return null;

  // h-11 w-11 trên mobile (44px), h-9 w-9 trên desktop
  const btnCls = "h-11 w-11 md:h-9 md:w-9";

  return (
    <>
      <div className="flex justify-end gap-1">
        {appt.status === "scheduled" && (
          <>
            <Tooltip label="Tiếp đón">
              <Button variant="ghost" size="icon" className={`${btnCls} text-emerald-700`} disabled={busy}
                onClick={() => run(() => checkInAppointment(appt.id))}>
                <UserCheck className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </Tooltip>
            <Tooltip label="Không đến">
              <Button variant="ghost" size="icon" className={`${btnCls} text-red-600`} disabled={busy}
                onClick={() => run(() => markNoShow(appt.id))}>
                <UserX className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </Tooltip>
            <Tooltip label="Hủy lịch">
              <Button variant="ghost" size="icon" className={btnCls} disabled={busy}
                onClick={() => run(() => cancelAppointment(appt.id))}>
                <X className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </Tooltip>
          </>
        )}
        {appt.status === "checked_in" && (
          <>
            <Tooltip label="Tạo lượt khám">
              <Button variant="ghost" size="icon" className={`${btnCls} text-emerald-700`} disabled={busy}
                onClick={onCreateVisit}>
                <Stethoscope className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </Tooltip>
            <Tooltip label="Hủy lịch">
              <Button variant="ghost" size="icon" className={btnCls} disabled={busy}
                onClick={() => run(() => cancelAppointment(appt.id))}>
                <X className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </Tooltip>
          </>
        )}
        {appt.status === "completed" && appt.visit_id && (
          <Link href={`/prescriptions/new?visitId=${appt.visit_id}`}>
            <Button variant="ghost" size="sm" className="h-11 md:h-8 text-xs text-emerald-700">
              Kê đơn
            </Button>
          </Link>
        )}
      </div>
      <InfoModal open={info !== null} onOpenChange={(o) => !o && setInfo(null)} title={info ?? ""} />
    </>
  );
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const st = STATUS[status];
  return <Badge className={st.cls}>{st.label}</Badge>;
}
