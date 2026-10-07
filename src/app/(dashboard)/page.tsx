import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Users,
  Package,
  ArrowRight,
  Stethoscope,
  FileText,
  Leaf,
  Plus,
} from "lucide-react";
import { STATUS_LABEL, STATUS_STYLE, type PrescriptionStatus } from "@/features/prescriptions/constants";

export default async function HomePage() {
  const user = await requireUser();
  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? "Chào buổi sáng" : hour < 14 ? "Chào buổi trưa" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  // Thống kê nhanh
  const [{ rows: s1 }, { rows: s2 }, { rows: s3 }, { rows: s4 }] = await Promise.all([
    db.query<{ count: string }>(
      `SELECT COUNT(*) FROM visits WHERE visited_at::date = CURRENT_DATE`,
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*) FROM prescriptions WHERE status IN ('draft','confirmed')`,
    ),
    db.query<{ count: string }>(`SELECT COUNT(*) FROM patients`),
    db.query<{ count: string }>(`SELECT COUNT(*) FROM herbs WHERE is_active = true`),
  ]);

  const stats = [
    { label: "Lượt khám hôm nay", value: s1[0].count, icon: Stethoscope, href: "/visits", iconBg: "bg-emerald-100 text-emerald-700" },
    { label: "Đơn chờ bốc thuốc", value: s2[0].count, icon: FileText, href: "/patients", iconBg: "bg-amber-100 text-amber-700" },
    { label: "Tổng bệnh nhân", value: s3[0].count, icon: Users, href: "/patients", iconBg: "bg-sky-100 text-sky-700" },
    { label: "Vị thuốc", value: s4[0].count, icon: Leaf, href: "/herbs", iconBg: "bg-lime-100 text-lime-700" },
  ];

  // Lượt khám gần đây
  interface RecentVisit { id: string; visited_at: string; full_name: string; patient_code: string }
  const { rows: recentVisits } = await db.query<RecentVisit>(
    `SELECT v.id, v.visited_at, p.full_name, p.patient_code
     FROM visits v JOIN patients p ON p.id = v.patient_id
     ORDER BY v.visited_at DESC LIMIT 5`,
  );

  // Đơn thuốc gần đây
  interface RecentPrescription { id: string; prescription_code: string; status: PrescriptionStatus; num_of_packs: number; full_name: string }
  const { rows: recentPrescriptions } = await db.query<RecentPrescription>(
    `SELECT pr.id, pr.prescription_code, pr.status, pr.num_of_packs, p.full_name
     FROM prescriptions pr
     JOIN visits v ON v.id = pr.visit_id
     JOIN patients p ON p.id = v.patient_id
     ORDER BY pr.created_at DESC LIMIT 5`,
  );

  const shortcuts = [
    { title: "Thư viện bài thuốc", description: "Cổ phương & nghiệm phương", icon: BookOpen, href: "/formulas", iconBg: "bg-emerald-100 text-emerald-700" },
    { title: "Quản lý vị thuốc", description: "Danh mục dược liệu chuẩn hóa", icon: Leaf, href: "/herbs", iconBg: "bg-lime-100 text-lime-700" },
    { title: "Kho dược liệu", description: "Nhập, xuất, tồn kho", icon: Package, href: null, iconBg: "bg-stone-200 text-stone-500", comingSoon: true },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Banner chào mừng — nền nhạt */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 md:p-6">
        <div>
          <h1 className="text-xl font-bold text-emerald-900 md:text-2xl">
            {greeting}, {user.full_name}
          </h1>
          <p className="mt-1 text-sm text-emerald-700">
            Chào mừng trở lại với phòng thuốc Đông y của bạn
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/patients">
            <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900">
              <Plus className="mr-1 h-4 w-4" /> Khám mới
            </Button>
          </Link>
          <Link href="/visits">
            <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-800 hover:bg-emerald-100">
              <Plus className="mr-1 h-4 w-4" /> Kê đơn mới
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Thống kê nhanh */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-stone-900">{s.value}</p>
                    <p className="truncate text-xs text-stone-500">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 3. Hai cột: hoạt động gần đây + lối tắt */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Trái: lượt khám & đơn thuốc gần đây */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Lượt khám gần đây</CardTitle>
              <Link href="/visits" className="text-xs font-medium text-emerald-700 hover:underline">
                Xem tất cả
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentVisits.length === 0 ? (
                <p className="p-4 text-sm text-stone-500">Chưa có lượt khám nào.</p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {recentVisits.map((v) => (
                    <li key={v.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="font-medium text-stone-900">
                        {v.full_name}
                        <span className="ml-2 font-mono text-xs text-stone-500">{v.patient_code}</span>
                      </span>
                      <span className="text-xs text-stone-500">
                        {new Date(v.visited_at).toLocaleString("vi-VN", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Đơn thuốc gần đây</CardTitle>
              <Link href="/patients" className="text-xs font-medium text-emerald-700 hover:underline">
                Xem tất cả
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentPrescriptions.length === 0 ? (
                <p className="p-4 text-sm text-stone-500">Chưa có đơn thuốc nào.</p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {recentPrescriptions.map((pr) => (
                    <li key={pr.id}>
                      <Link
                        href={`/prescriptions/${pr.id}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-stone-50"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-stone-400" />
                        <span className="font-medium">{pr.prescription_code}</span>
                        <span className="truncate text-stone-500">· {pr.full_name}</span>
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

        {/* Phải: lối tắt phân hệ */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-stone-700">Truy cập nhanh</h2>
          {shortcuts.map((m) => {
            const Icon = m.icon;
            const card = (
              <Card
                className={`transition-shadow hover:shadow-md ${
                  m.comingSoon ? "border-dashed" : ""
                }`}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-900">{m.title}</p>
                    <CardDescription className="truncate text-xs">{m.description}</CardDescription>
                  </div>
                  {m.comingSoon ? (
                    <Badge variant="secondary" className="shrink-0 bg-stone-100 text-stone-500">
                      Sắp có
                    </Badge>
                  ) : (
                    <ArrowRight className="h-4 w-4 shrink-0 text-stone-400" />
                  )}
                </CardContent>
              </Card>
            );
            return m.href ? (
              <Link key={m.title} href={m.href} className="block">{card}</Link>
            ) : (
              <div key={m.title}>{card}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
