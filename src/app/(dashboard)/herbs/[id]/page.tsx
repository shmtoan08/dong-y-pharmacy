import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, getSessionUser } from "@/lib/auth";
import { getHerb, toggleHerbActive, removeAlias } from "@/features/herbs/actions";
import { BackButton } from "@/components/shared/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AliasForm } from "./AliasForm";
import { DosageLimitCard } from "./DosageLimitCard";
import { getDosageLimit } from "@/features/prescriptions/actions";
import { Pencil, Trash2 } from "lucide-react";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="text-sm text-stone-900">{value}</p>
    </div>
  );
}

export default async function HerbDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();
  await requireRole("admin", "practitioner", "dispenser");
  const dosageLimit = await getDosageLimit(id);
  const canManageDose = user.role === "admin" || user.role === "practitioner";
  const herb = await getHerb(id);
  if (!herb) notFound();

  const canEdit = user.role === "admin" || user.role === "practitioner";

  return (
    <div className="space-y-4">
      <BackButton href="/herbs" />
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-stone-900 md:text-2xl">{herb.name_common}</h1>
            <Badge variant="outline" className="font-mono">{herb.code}</Badge>
            {herb.is_valuable && (
              <Badge variant="outline" className="border-amber-300 text-amber-700">Thuốc quý</Badge>
            )}
            {!herb.is_active && <Badge variant="secondary">Ngưng dùng</Badge>}
          </div>
        </div>
        {canEdit && (
          <Link href={`/herbs/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-1 h-4 w-4" /> Sửa
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Thông tin dược liệu</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Tên Hán Việt" value={herb.name_han_viet} />
          <Field label="Tên khoa học" value={herb.name_science} />
          <Field label="Bộ phận dùng" value={herb.used_part} />
          <Field label="Đơn vị tính" value={herb.base_unit} />
          <Field label="Tính" value={herb.property_tinh} />
          <Field label="Vị" value={herb.property_vi} />
          <Field label="Quy kinh" value={herb.quy_kinh?.join(", ")} />
          <div className="md:col-span-2">
            <Field label="Công năng" value={herb.cong_nang} />
          </div>
          <div className="md:col-span-2">
            <Field label="Kiêng kỵ & Chống chỉ định" value={herb.kieng_ky} />
          </div>
          <Field label="Vị trí hộc tủ" value={herb.vi_tri_hoc_tu} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tên khác ({herb.aliases.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {herb.aliases.length === 0 ? (
            <p className="text-sm text-stone-500">Chưa có tên khác.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {herb.aliases.map((a) => (
                <li key={a.id} className="flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1 text-sm">
                  {a.alias_name}
                  {canEdit && (
                    <form action={removeAlias.bind(null, id, a.id)}>
                      <button type="submit" className="text-red-500 hover:text-red-700" aria-label={`Xóa ${a.alias_name}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canEdit && <AliasForm herbId={id} />}
        </CardContent>
      </Card>

      <DosageLimitCard
        herbId={id}
        baseUnit={herb.base_unit}
        initial={dosageLimit}
        canManage={canManageDose}
      />

      {canEdit && (
        <form action={toggleHerbActive.bind(null, id)}>
          <Button type="submit" variant="outline" size="sm"
            className={herb.is_active ? "text-red-600" : "text-emerald-700"}>
            {herb.is_active ? "Ngưng dùng vị thuốc này" : "Kích hoạt lại"}
          </Button>
        </form>
      )}
    </div>
  );
}
