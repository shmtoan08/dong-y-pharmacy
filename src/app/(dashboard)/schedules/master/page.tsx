export const dynamic = "force-dynamic";

import { getMasterSchedule } from "@/features/schedules/master";

const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function MasterSchedulePage() {
  const matrix = await getMasterSchedule();
  const isSingle = matrix.length === 1;

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">Lịch trực toàn phòng khám</h1>
        <p className="text-sm text-stone-500">
          {isSingle
            ? "Phòng khám hiện có 1 bác sĩ"
            : `Phòng khám hiện có ${matrix.length} bác sĩ`}
        </p>
      </div>

      {matrix.length === 0 ? (
        <p className="py-8 text-center text-stone-400">Chưa có bác sĩ nào</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-stone-50">
                <th className="p-3 text-left font-semibold">Bác sĩ</th>
                {DAY_ORDER.map((dow) => (
                  <th key={dow} className="p-3 text-center font-semibold">
                    {DAY_NAMES[dow]}
                  </th>
                ))}
                <th className="p-3 text-left font-semibold">Ngày nghỉ sắp tới</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((doc) => (
                <tr key={doc.doctorId} className="border-b last:border-0">
                  <td className="p-3 font-medium">{doc.doctorName}</td>
                  {DAY_ORDER.map((dow) => {
                    const d = doc.days[dow];
                    return (
                      <td key={dow} className="p-3 text-center">
                        {d.working ? (
                          <span className="inline-block rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
                            {d.hours}
                          </span>
                        ) : (
                          <span className="inline-block rounded-lg bg-stone-100 px-2 py-1 text-xs text-stone-400">
                            Nghỉ
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-3 text-xs text-stone-500">
                    {doc.dayOffs.length === 0 ? (
                      <span className="text-stone-300">—</span>
                    ) : (
                      <ul className="list-disc pl-4">
                        {doc.dayOffs.map((o, i) => (
                          <li key={i}>{o}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-stone-400">
        💡 Lễ tân dùng bảng này để tư vấn bệnh nhân: ngày nào bác sĩ nghỉ thì hướng sang ngày khác.
      </p>
    </div>
  );
}
