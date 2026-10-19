"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "./AppointmentActions";
import { AppointmentRowActions } from "./AppointmentActions";
import { RescheduleButton } from "./RescheduleButton";
import type { AppointmentRow } from "@/features/appointments/actions";

/** Dialog chi tiết lịch hẹn — bấm vào dòng để xem */
export function AppointmentDetailDialog({
  appt,
  canManage,
  trigger,
}: {
  appt: AppointmentRow;
  canManage: boolean;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chi tiết lịch hẹn</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-stone-500">Trạng thái</span>
              <StatusBadge status={appt.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-stone-500">Giờ hẹn</span>
              <span>
                {new Date(appt.scheduled_at).toLocaleString("vi-VN", {
                  hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric",
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-stone-500">Bệnh nhân</span>
              <Link href={`/patients/${appt.patient_id}`} className="font-medium text-emerald-700 hover:underline">
                {appt.patient_name}
                {appt.patient_phone && <span className="text-stone-500"> · {appt.patient_phone}</span>}
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-stone-500">Bác sĩ</span>
              <span>{appt.practitioner_name ?? "—"}</span>
            </div>
            {appt.reason && (
              <div>
                <p className="font-medium text-stone-500">Lý do khám</p>
                <p>{appt.reason}</p>
              </div>
            )}
            {appt.note && (
              <div>
                <p className="font-medium text-stone-500">Ghi chú</p>
                <p>{appt.note}</p>
              </div>
            )}
            {canManage && (
              <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                <span className="font-medium text-stone-500">Thao tác</span>
                <div className="flex items-center gap-1">
                  {appt.status === "scheduled" && (
                    <RescheduleButton appointmentId={appt.id} currentAt={appt.scheduled_at} />
                  )}
                  <AppointmentRowActions appt={appt} canManage={canManage} />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
