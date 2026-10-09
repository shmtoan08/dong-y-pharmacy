export const dynamic = "force-dynamic";

import { getMyWeeklySchedule, getMyDayOffs, getMyWeeklyDensity } from "@/features/schedules/actions";
import { ScheduleBoard } from "./ScheduleBoard";

export default async function SchedulesPage() {
  const [weekly, dayOffs, density] = await Promise.all([
    getMyWeeklySchedule(),
    getMyDayOffs(),
    getMyWeeklyDensity(),
  ]);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">Lịch làm việc</h1>
        <p className="text-sm text-stone-500">Đăng ký lịch tuần và ngày nghỉ của bạn</p>
      </div>
      <ScheduleBoard initialWeekly={weekly} initialDayOffs={dayOffs} density={density} />
    </div>
  );
}
