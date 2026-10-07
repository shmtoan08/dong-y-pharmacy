import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { STATUS_LABEL, STATUS_STYLE, type PrescriptionStatus } from "@/features/prescriptions/constants";

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "draft", label: "Nháp" },
  { value: "confirmed", label: "Đã chốt" },
  { value: "completed", label: "Đã bốc thuốc" },
  { value: "cancelled", label: "Đã hủy" },
];

export default async function PrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole("admin", "practitioner", "dispenser");
  const { status } = await searchParams;

  const params: unknown[] = [];
  let where = "";
  if (status && ["draft", "confirmed", "completed", "cancelled"].includes(status)) {
    params.push(status);
    where = `WHERE pr.status = $1`;
  }

  interface Row {
    id: string; prescription_code: string; status: PrescriptionStatus;
    num_of_packs: number; full_name: string; patient_code: string; created_at: string;
  }
  const { rows } = await db.query<Row>(
    `SELECT pr.id, pr.prescription_code, pr.status, pr.num_of_packs,
            p.full_name, p.patient_code, pr.created_at
     FROM prescriptions pr
     JOIN visits v ON v.id = pr.visit_id
     JOIN patients p ON p.id = v.patient_id
     ${where}
     ORDER BY pr.created_at DESC
     LIMIT 100`,
    params,
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Kê đơn & Bốc thuốc</h1>
        <p className="text-sm text-stone-500">Danh sách đơn thuốc — nhân viên bốc thuốc xử lý tại đây</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.value} href={f.value ? `/prescriptions?status=${f.value}` : "/prescriptions"}>
            <Button
              variant={(status ?? "") === f.value ? "default" : "outline"}
              size="sm"
              className={(status ?? "") === f.value ? "bg-emerald-800 hover:bg-emerald-900" : ""}
            >
              {f.label}
            </Button>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Đơn thuốc ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-stone-500">Chưa có đơn thuốc nào.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {rows.map((pr) => (
                <li key={pr.id}>
                  <Link
                    href={`/prescriptions/${pr.id}`}
                    className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-stone-50"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-stone-400" />
                    <div className="min-w-0">
                      <p className="font-medium text-stone-900">
                        {pr.prescription_code}
                        <span className="ml-2 font-normal text-stone-500">{pr.num_of_packs} thang</span>
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        {pr.full_name} · {pr.patient_code}
                      </p>
                    </div>
                    <Badge className={`ml-auto shrink-0 ${STATUS_STYLE[pr.status]}`}>
                      {STATUS_LABEL[pr.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
