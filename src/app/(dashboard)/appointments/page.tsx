export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import Link from "next/link";
import { listAppointments, getTodayStats } from "@/features/appointments/actions";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NewAppointmentButton } from "./NewAppointmentButton";
import { DateNavigator } from "./DateNavigator";
import { AppointmentRowActions, StatusBadge } from "./AppointmentActions";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const date = sp.date || new Date().toISOString().slice(0, 10);
  const [appointments, stats, user] = await Promise.all([
    listAppointments(date),
    getTodayStats(date),
    getSessionUser(),
  ]);

  // Danh sách bác sĩ (practitioner)
  const { rows: practitioners } = await db.query<{ id: string; full_name: string }>(
    `SELECT u.id, u.full_name FROM users u WHERE u.role = 'practitioner' AND u.is_active = true ORDER BY u.full_name`,
  );

  const canManage = user?.role === "admin" || user?.role === "practitioner";
  const isToday = date === new Date().toISOString().slice(0, 10);

  const statCards = [
    { label: "Đã đặt", value: stats.scheduled, cls: "text-blue-700" },
    { label: "Đã tiếp đón", value: stats.checked_in, cls: "text-amber-700" },
    { label: "Hoàn thành", value: stats.completed, cls: "text-emerald-700" },
    { label: "Không đến", value: stats.no_show, cls: "text-red-700" },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Tiếp đón & Lịch hẹn</h1>
            <p className="text-sm text-stone-500">
              {isToday ? "Hôm nay" : new Date(date).toLocaleDateString("vi-VN")} · {appointments.length} lịch hẹn
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DateNavigator date={date} />
            {canManage && <NewAppointmentButton practitioners={practitioners} />}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-xs text-stone-500">{s.label}</p>
                <p className={`mt-1 text-xl font-bold ${s.cls}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left">
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Giờ hẹn</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Bệnh nhân</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Bác sĩ</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Lý do</th>
                    <th className="px-4 py-2.5 font-medium text-stone-600">Trạng thái</th>
                    <th className="px-4 py-2.5 text-right font-medium text-stone-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium">
                        {new Date(a.scheduled_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/patients/${a.patient_id}`} className="font-medium hover:text-emerald-700 hover:underline">
                          {a.patient_name}
                        </Link>
                        {a.patient_phone && <span className="block text-xs text-stone-500">{a.patient_phone}</span>}
                      </td>
                      <td className="px-4 py-2.5">{a.practitioner_name ?? "—"}</td>
                      <td className="max-w-xs truncate px-4 py-2.5 text-stone-600">{a.reason ?? "—"}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-2.5">
                        <AppointmentRowActions appt={a} canManage={canManage} />
                      </td>
                    </tr>
                  ))}
                  {appointments.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-500">Không có lịch hẹn nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3 md:hidden">
          {appointments.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-1.5 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {new Date(a.scheduled_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-sm">
                  <Link href={`/patients/${a.patient_id}`} className="font-medium">{a.patient_name}</Link>
                  {a.patient_phone && <span className="text-stone-500"> · {a.patient_phone}</span>}
                </p>
                {a.reason && <p className="text-sm text-stone-600">Lý do: {a.reason}</p>}
                <div className="flex justify-end border-t border-stone-100 pt-2">
                  <AppointmentRowActions appt={a} canManage={canManage} />
                </div>
              </CardContent>
            </Card>
          ))}
          {appointments.length === 0 && (
            <p className="py-6 text-center text-sm text-stone-500">Không có lịch hẹn nào.</p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
