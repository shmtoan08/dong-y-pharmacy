import { notFound } from "next/navigation";
import { getManualTransaction } from "@/features/finance/queries";
import { PrintButton } from "@/components/shared/PrintButton";

function numberToVietnamese(n: number): string {
  // Đơn giản: đọc số tiền bằng chữ (triệu, nghìn, đồng)
  const units = ["", "nghìn", "triệu", "tỷ"];
  if (n === 0) return "Không đồng";
  let result = "";
  let i = 0;
  let num = Math.round(n);
  while (num > 0 && i < units.length) {
    const part = num % 1000;
    if (part > 0) {
      result = `${part} ${units[i]} `.trim() + (result ? " " + result : "");
    }
    num = Math.floor(num / 1000);
    i++;
  }
  return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
}

export default async function ManualTxPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tx = await getManualTransaction(id);
  if (!tx) notFound();

  const isIncome = tx.type === "income";
  const fmt = (n: number) => Number(n).toLocaleString("vi-VN") + "đ";

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 print:p-0">
      <div className="mb-6 flex items-start justify-between print:hidden">
        <h1 className="text-lg font-bold">Xem trước {isIncome ? "phiếu thu" : "phiếu chi"}</h1>
        <PrintButton />
      </div>

      <div className="space-y-5 text-sm">
        <div className="text-center">
          <h2 className="text-lg font-bold">ĐÔNG Y ĐƯỜNG</h2>
          <p className="text-stone-600">Phòng khám Y học cổ truyền</p>
          <h3 className="mt-3 text-xl font-bold uppercase">
            {isIncome ? "Phiếu thu" : "Phiếu chi"}
          </h3>
          <p className="mt-1">Số: <span className="font-mono font-medium">{tx.code}</span></p>
          <p className="text-stone-600">
            Ngày: {new Date(tx.created_at).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
          </p>
        </div>

        <div className="space-y-2 border-y border-stone-200 py-4">
          <p>
            <span className="font-medium">{isIncome ? "Người nộp tiền" : "Người nhận tiền"}:</span>{" "}
            {tx.person ?? "—"}
          </p>
          <p>
            <span className="font-medium">Lý do {isIncome ? "thu" : "chi"}:</span> {tx.reason}
          </p>
          <p>
            <span className="font-medium">Số tiền:</span>{" "}
            <span className="text-base font-bold">{fmt(tx.amount)}</span>
          </p>
          <p>
            <span className="font-medium">Bằng chữ:</span>{" "}
            <span className="italic">{numberToVietnamese(tx.amount)}</span>
          </p>
          <p>
            <span className="font-medium">Hình thức:</span>{" "}
            {tx.method === "cash" ? "Tiền mặt" : "Chuyển khoản"}
          </p>
          {tx.note && (
            <p><span className="font-medium">Ghi chú:</span> {tx.note}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 pt-6 text-center">
          <div>
            <p className="font-medium">Người lập phiếu</p>
            <p className="text-xs text-stone-500">({tx.user_name ?? ""})</p>
            <p className="mt-16 text-xs text-stone-500">(Ký, ghi rõ họ tên)</p>
          </div>
          <div>
            <p className="font-medium">Thủ quỹ</p>
            <p className="mt-16 text-xs text-stone-500">(Ký, ghi rõ họ tên)</p>
          </div>
          <div>
            <p className="font-medium">{isIncome ? "Người nộp tiền" : "Người nhận tiền"}</p>
            <p className="mt-16 text-xs text-stone-500">(Ký, ghi rõ họ tên)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
