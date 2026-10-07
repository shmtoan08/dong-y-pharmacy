import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface VisitRow {
  id: string;
  visited_at: string;
  patient_id: string;
  full_name: string;
  patient_code: string;
  prescription_id: string | null;
  prescription_code: string | null;
  prescription_status: string | null;
}

export default async function VisitsPage() {
  await requireRole("admin", "practitioner");

  const { rows } = await db.query<VisitRow>(
    `SELECT v.id, v.visited_at, v.patient_id,
            p.full_name, p.patient_code,
            pr.id AS prescription_id, pr.prescription_code,
            pr.status AS prescription_status
     FROM visits v
     JOIN patients p ON p.id = v.patient_id
     LEFT JOIN prescriptions pr ON pr.visit_id = v.id
     ORDER BY v.visited_at DESC, v.created_at DESC
     LIMIT 100`,
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Lượt khám</h1>
        <p className="text-sm text-stone-500">
          100 lượt khám gần nhất — bấm vào để xem chi tiết bệnh nhân
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-stone-500">
              Chưa có lượt khám nào. Vào trang bệnh nhân để tạo lượt khám mới.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {rows.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/patients/${v.patient_id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-stone-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-900">
                        {v.full_name}
                        <span className="ml-2 font-mono text-xs text-stone-500">
                          {v.patient_code}
                        </span>
                      </p>
                      <p className="text-xs text-stone-500">
                        {new Date(v.visited_at).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    {v.prescription_id ? (
                      <Badge variant="outline" className="shrink-0">
                        {v.prescription_code}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        Chưa kê đơn
                      </Badge>
                    )}
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
