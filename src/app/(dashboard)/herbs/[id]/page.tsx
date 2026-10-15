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
import Image from "next/image";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="text-sm text-stone-900">{value}</p>
    </div>
  );
}

const MEDICINE_TYPE_LABEL: Record<string, string> = {
  bac: "Thuốc Bắc",
  nam: "Thuốc Nam",
  ca_hai: "Bắc & Nam",
};

const MEDICINE_TYPE_BADGE: Record<string, string> = {
  bac: "border-sky-300 text-sky-700",
  nam: "border-emerald-300 text-emerald-700",
  ca_hai: "border-violet-300 text-violet-700",
};

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
  const medicineType = herb.medicine_type;

  return (
    <div className="space-y-4">
      <BackButton href="/herbs" />
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {herb.image_url && (
            <Image
              src={herb.image_url}
              alt={herb.name_common}
              width={80}
              height={80}
              className="rounded-lg border border-stone-200 object-cover"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-stone-900 md:text-2xl">{herb.name_common}</h1>
              <Badge variant="outline" className="font-mono">{herb.code}</Badge>
              {medicineType && MEDICINE_TYPE_LABEL[medicineType] && (
                <Badge variant="outline" className={MEDICINE_TYPE_BADGE[medicineType]}>
                  {MEDICINE_TYPE_LABEL[medicineType]}
                </Badge>
              )}
              {herb.is_valuable && (
                <Badge variant="outline" className="border-amber-300 text-amber-700">Thuốc quý</Badge>
              )}
              {!herb.is_active && <Badge variant="secondary">Ngưng dùng</Badge>}
            </div>
            {herb.group_name && (
              <p className="mt-1 text-sm text-stone-500">{herb.group_name}</p>
            )}
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
          <Field label="Nhóm thuốc" value={herb.group_name} />
          <Field label="Phân loại" value={medicineType ? MEDICINE_TYPE_LABEL[medicineType] : null} />
          <Field label="Bộ phận dùng" value={herb.used_part} />
          <Field label="Đơn vị tính" value={herb.base_unit} />
          <Field label="Tính" value={herb.property_tinh} />
          <Field label="Vị" value={herb.property_vi} />
          <Field label="Quy kinh" value={herb.quy_kinh?.join(", ")} />
          <Field label="Cách dùng" value={herb.usage} />
          <div className="md:col-span-2">
            <Field label="Công năng" value={herb.cong_nang} />
          </div>
          <div className="md:col-span-2">
            <Field label="Cách bào chế" value={herb.preparation} />
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
