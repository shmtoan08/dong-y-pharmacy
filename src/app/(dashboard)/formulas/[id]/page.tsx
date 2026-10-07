import { BackButton } from "@/components/shared/BackButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CATEGORY_LABEL } from "@/features/formulas/schemas";
import { FormulaDetailActions } from "./FormulaDetailActions";

export default async function FormulaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const canEdit = user.role === "admin" || user.role === "practitioner";

  const { rows: tpl } = await db.query(
    `SELECT t.*, u.full_name AS created_by_name
     FROM prescription_templates t
     LEFT JOIN users u ON u.id = t.created_by
     WHERE t.id = $1`,
    [id],
  );
  if (tpl.length === 0) notFound();
  const t = tpl[0];

  const { rows: items } = await db.query(
    `SELECT herb_name, herb_name_key, dosage_text, note
     FROM prescription_template_items
     WHERE template_id = $1 ORDER BY sort_order`,
    [id],
  );

  // Lịch sử version của cùng code
  const { rows: versions } = await db.query(
    `SELECT id, version, created_at, is_active
     FROM prescription_templates
     WHERE code = $1 ORDER BY version DESC`,
    [t.code],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackButton href="/formulas" />
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{t.name}</h1>
            <Badge variant="outline">v{t.version}</Badge>
            <Badge
              variant={t.is_active ? "default" : "secondary"}
              className={t.is_active ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : ""}
            >
              {t.is_active ? "Đang dùng" : "Ngưng"}
            </Badge>
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{t.code}</p>
        </div>
        {canEdit && <FormulaDetailActions id={t.id} isActive={t.is_active} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin chung</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Phân loại</p>
            <p className="font-medium">{CATEGORY_LABEL[t.category] ?? t.category}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Nguồn</p>
            <p className="font-medium">{t.source_book ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Hội chứng</p>
            <p className="font-medium">{t.syndrome ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Người tạo</p>
            <p className="font-medium">{t.created_by_name ?? "—"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Chỉ định</p>
            <p className="whitespace-pre-wrap">{t.indications ?? "—"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Cách dùng</p>
            <p className="whitespace-pre-wrap">{t.usage_note ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vị thuốc ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Vị thuốc</TableHead>
                <TableHead>Liều</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it, i) => (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{it.herb_name}</TableCell>
                  <TableCell>{it.dosage_text}</TableCell>
                  <TableCell className="text-muted-foreground">{it.note ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {versions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử version</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center gap-3 text-sm">
                  {v.id === t.id ? (
                    <span className="font-semibold">v{v.version} (đang xem)</span>
                  ) : (
                    <Link
                      href={`/formulas/${v.id}`}
                      className="text-emerald-800 hover:underline"
                    >
                      v{v.version}
                    </Link>
                  )}
                  <span className="text-muted-foreground">
                    {new Date(v.created_at).toLocaleDateString("vi-VN")}
                  </span>
                  {!v.is_active && <Badge variant="secondary">Ngưng</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/formulas">← Danh sách</Link>
        </Button>
        {canEdit && (
          <Button asChild className="bg-emerald-800 hover:bg-emerald-900">
            <Link href={`/formulas/${t.id}/edit`}>Sửa (tạo v{Number(t.version) + 1})</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
