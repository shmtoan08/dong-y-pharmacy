import { requireUser } from "@/lib/auth";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Users, Package, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MODULES = [
  {
    title: "Bài thuốc",
    description: "Thư viện bài thuốc của phòng thuốc",
    icon: BookOpen,
    phase: "",
    accent: "border-t-emerald-600",
    iconBg: "bg-emerald-100 text-emerald-700",
    href: "/formulas",
  },
  {
    title: "Bệnh nhân",
    description: "Hồ sơ và quá trình điều trị",
    icon: Users,
    phase: "MVP-2",
    accent: "border-t-amber-500",
    iconBg: "bg-amber-100 text-amber-700",
  },
  {
    title: "Kho dược liệu",
    description: "Nhập kho, tồn kho, cảnh báo hết hạn",
    icon: Package,
    phase: "MVP-4",
    accent: "border-t-stone-500",
    iconBg: "bg-stone-200 text-stone-700",
  },
];

export default async function HomePage() {
  const user = await requireUser();
  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? "Chào buổi sáng" : hour < 14 ? "Chào buổi trưa" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  return (
    <div className="space-y-6">
      {/* Banner chào mừng */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 p-5 text-white shadow-lg md:p-8">
        <div className="relative z-10">
          <h1 className="text-xl font-bold md:text-2xl">
            {greeting}, {user.full_name}
          </h1>
          <p className="mt-1 text-emerald-100/90">
            Chào mừng trở lại với phòng thuốc Đông y của bạn
          </p>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-600/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-32 h-40 w-40 rounded-full bg-amber-400/20 blur-2xl" />
      </div>

      {/* Cards phân hệ */}
      <div className="grid gap-5 md:grid-cols-3">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const card = (
            <Card
              key={m.title}
              className={`group h-full border-t-4 ${m.accent} shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${m.href ? "cursor-pointer" : ""}`}
            >
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${m.iconBg}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <CardTitle className="text-base">{m.title}</CardTitle>
                  <CardDescription>{m.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                {m.phase ? (
                  <Badge variant="secondary" className="bg-stone-100 text-stone-600">
                    {m.phase} — Đang xây dựng
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-800 hover:bg-emerald-900">Xem danh sách</Badge>
                )}
                <ArrowRight className="h-4 w-4 text-stone-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </CardContent>
            </Card>
          );
          return m.href ? (
            <Link key={m.title} href={m.href} className="block">
              {card}
            </Link>
          ) : (
            <div key={m.title}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
