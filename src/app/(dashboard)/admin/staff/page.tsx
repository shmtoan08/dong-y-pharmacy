import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { ToggleActiveButton } from "./ToggleActiveButton";
import { ResetPasswordButton } from "./ResetPasswordButton";
import { StaffFilterToolbar } from "./StaffFilterToolbar";
import { PageSizeSelect } from "../../visits/PageSizeSelect";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

const PAGE_SIZES = [10, 25, 50];

const ROLE_LABEL: Record<string, string> = {
  admin: "Quản trị",
  practitioner: "Thầy thuốc",
  dispenser: "Nhân viên bốc thuốc",
};

const ROLE_STYLE: Record<string, string> = {
  admin: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  practitioner: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  dispenser: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
};

function avatarColor(name: string): string {
  const colors = [
    "bg-emerald-700",
    "bg-teal-700",
    "bg-cyan-700",
    "bg-sky-700",
    "bg-lime-700",
  ];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return colors[h % colors.length];
}

type StaffRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
};

export default async function StaffListPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    page?: string;
    size?: string;
  }>;
}) {
  const me = await requireRole("admin");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const roleFilter = ["admin", "practitioner", "dispenser"].includes(sp.role ?? "")
    ? sp.role!
    : "all";
  const statusFilter = ["active", "locked"].includes(sp.status ?? "")
    ? sp.status!
    : "all";
  const pageSize = PAGE_SIZES.includes(Number(sp.size)) ? Number(sp.size) : 10;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (q) {
    where.push(`(u.full_name ILIKE $${i} OR u.email ILIKE $${i} OR u.phone ILIKE $${i})`);
    params.push(`%${q}%`);
    i++;
  }
  if (roleFilter !== "all") {
    where.push(`u.role = $${i}`);
    params.push(roleFilter);
    i++;
  }
  if (statusFilter === "active") {
    where.push(`u.is_active = true`);
  } else if (statusFilter === "locked") {
    where.push(`u.is_active = false`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRes = await db.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM users u ${whereSql}`,
    params,
  );
  const total = countRes.rows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const { rows } = await db.query<StaffRow>(
    `SELECT u.id, u.email, u.full_name, u.phone, u.role, u.is_active
     FROM users u
     ${whereSql}
     ORDER BY u.created_at ASC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, pageSize, offset],
  );

  const buildHref = (overrides: Record<string, string>) => {
    const next: Record<string, string> = {
      q,
      role: roleFilter,
      status: statusFilter,
      page: String(safePage),
      size: String(pageSize),
      ...overrides,
    };
    const all = Object.entries(next).filter(
      ([k, v]) =>
        v && !(k === "role" && v === "all") && !(k === "status" && v === "all"),
    );
    return all.length
      ? `/admin/staff?${all.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`
      : "/admin/staff";
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
              Nhân viên & Bác sĩ
            </h1>
            <p className="text-sm text-stone-500">{total} tài khoản</p>
          </div>
          <Link href="/admin/staff/new">
            <Button className="bg-emerald-800 hover:bg-emerald-900">
              <Plus className="mr-1 h-4 w-4" /> Thêm nhân viên
            </Button>
          </Link>
        </div>

        {/* Toolbar lọc */}
        <StaffFilterToolbar
          initialQ={q}
          initialRole={roleFilter}
          initialStatus={statusFilter}
        />

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-stone-500">
              Không tìm thấy tài khoản nào.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop: bảng */}
            <div className="hidden overflow-x-auto rounded-lg border border-stone-200 bg-white md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-500">
                    <th className="px-4 py-3">Nhân viên</th>
                    <th className="px-4 py-3">Email / Tài khoản</th>
                    <th className="px-4 py-3">SĐT</th>
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-stone-100 transition-colors last:border-0 hover:bg-stone-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(u.full_name)}`}
                          >
                            {u.full_name.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-semibold text-stone-900">
                            {u.full_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-stone-600">{u.email}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                        {u.phone || <span className="text-stone-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge className={ROLE_STYLE[u.role] ?? ""}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {u.is_active ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            Đang hoạt động
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                            Đã khóa
                          </Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Tooltip label="Chỉnh sửa">
                            <Link href={`/admin/staff/${u.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-stone-500 hover:text-emerald-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                          </Tooltip>
                          <ResetPasswordButton id={u.id} name={u.full_name} />
                          {u.id !== me.id && (
                            <ToggleActiveButton
                              id={u.id}
                              isActive={u.is_active}
                              name={u.full_name}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <div className="grid gap-3 md:hidden">
              {rows.map((u) => (
                <Card key={u.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(u.full_name)}`}
                        >
                          {u.full_name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-stone-900">
                            {u.full_name}
                          </p>
                          <p className="truncate text-xs text-stone-500">{u.email}</p>
                        </div>
                      </div>
                      <Badge className={`${ROLE_STYLE[u.role] ?? ""} shrink-0`}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </Badge>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Link href={`/admin/staff/${u.id}`}>
                        <Button variant="outline" size="sm">
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Sửa
                        </Button>
                      </Link>
                      <ResetPasswordButton id={u.id} name={u.full_name} />
                      {u.id !== me.id && (
                        <ToggleActiveButton
                          id={u.id}
                          isActive={u.is_active}
                          name={u.full_name}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chân bảng */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-stone-500">
              <p>
                {total === 0
                  ? "Không có tài khoản nào"
                  : `Hiển thị ${offset + 1}–${Math.min(offset + pageSize, total)} trên ${total} tài khoản`}
              </p>
              <div className="flex items-center gap-3">
                <PageSizeSelect value={pageSize} options={PAGE_SIZES} basePath="/admin/staff" />
                <div className="flex gap-1">
                  <Link href={buildHref({ page: String(safePage - 1) })}>
                    <Button variant="outline" size="sm" disabled={safePage <= 1}>
                      ‹
                    </Button>
                  </Link>
                  <span className="flex items-center px-2 font-medium text-stone-900">
                    {safePage} / {totalPages}
                  </span>
                  <Link href={buildHref({ page: String(safePage + 1) })}>
                    <Button variant="outline" size="sm" disabled={safePage >= totalPages}>
                      ›
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
