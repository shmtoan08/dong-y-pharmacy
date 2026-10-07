import { searchPatients } from "@/features/patients/actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Phone, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SEX_LABEL: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const patients = q ? await searchPatients(q) : await searchPatients("");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Bệnh nhân</h1>
          <p className="text-sm text-stone-500">
            {patients.length} hồ sơ
          </p>
        </div>
        <Link href="/patients/new">
          <Button className="bg-emerald-800 hover:bg-emerald-900">
            <Plus className="mr-1 h-4 w-4" /> Thêm bệnh nhân
          </Button>
        </Link>
      </div>

      <form method="get" className="flex gap-2">
        <div className="relative w-full min-w-0 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Tìm theo tên, SĐT, mã BN..."
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          Tìm
        </Button>
      </form>

      {patients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-stone-500">
            {q ? "Không tìm thấy bệnh nhân phù hợp." : "Chưa có bệnh nhân nào."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {patients.map((p) => (
            <Link key={p.id} href={`/patients/${p.id}`} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-stone-900">
                        {p.full_name}
                      </p>
                      <p className="text-xs text-stone-500">{p.patient_code}</p>
                    </div>
                    {p.sex && (
                      <Badge variant="secondary" className="shrink-0 bg-stone-100 text-stone-600">
                        {SEX_LABEL[p.sex] ?? p.sex}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-stone-600">
                    {p.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-stone-400" /> {p.phone}
                      </p>
                    )}
                    {p.date_of_birth && (
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-stone-400" />
                        {new Date(p.date_of_birth).toLocaleDateString("vi-VN")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
