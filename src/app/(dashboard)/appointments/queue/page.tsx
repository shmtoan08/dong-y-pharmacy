import { getTodayQueue } from "@/features/appointments/queries";
import { QueueBoard } from "./QueueBoard";

export default async function QueuePage() {
  const queue = await getTodayQueue();

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">Hàng đợi khám hôm nay</h1>
        <p className="text-sm text-stone-500">Quản lý số thứ tự bốc online</p>
      </div>
      <QueueBoard initialQueue={queue} />
    </div>
  );
}
