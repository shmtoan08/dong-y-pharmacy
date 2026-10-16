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

export default async function ClinicalCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const canEdit = user.role === "admin" || user.role === "practitioner";

  const { rows } = await db.query(
    `SELECT c.*, d.name AS disease_name, d.description AS disease_description,
            t.name AS template_name, t.code AS template_code,
            t.version AS template_version, u.full_name AS created_by_name
     FROM clinical_cases c
     LEFT JOIN diseases d ON d.id = c.disease_id
     LEFT JOIN prescription_templates t ON t.id = c.template_id
     LEFT JOIN users u ON u.id = c.created_by
     WHERE c.id = $1`,
    [id],
  );
  if (rows.length === 0) notFound();
  const c = rows[0];

  // Các biện chứng khác của cùng bệnh
  const { rows: siblings } = await db.query<{
    id: string;
    pattern: string | null;
  }>(
    `SELECT id, pattern FROM clinical_cases
     WHERE disease_id = $1 AND id != $2 AND is_active = true
     ORDER BY created_at`,
    [c.disease_id, id],
  );

  // Vị thuốc của bài thuốc (nếu có)
  let items: { herb_name: string; dosage_text: string; note: string | null }[] = [];
  if (c.template_id) {
    const { rows: itemRows } = await db.query<{
      herb_name: string;
      dosage_text: string;
      note: string | null;
    }>(
      `SELECT herb_name, dosage_text, note
       FROM prescription_template_items
       WHERE template_id = $1 ORDER BY sort_order`,
      [c.template_id],
    );
    items = itemRows;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <BackButton href="/clinical-cases" />
        {canEdit && (
          <Button asChild className="bg-emerald-800 hover:bg-emerald-900">
            <Link href={`/clinical-cases/${c.id}/edit`}>Sửa</Link>
          </Button>
        )}
      </div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{c.disease_name}</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{c.pattern ?? "(Chưa có biện chứng)"}</h1>
            <Badge
              variant={c.is_active ? "default" : "secondary"}
              className={c.is_active ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : ""}
            >
              {c.is_active ? "Đang dùng" : "Ngưng"}
            </Badge>
          </div>
          {c.source && (
            <p className="mt-1 text-sm text-muted-foreground">Nguồn: {c.source}</p>
          )}
        </div>
      </div>

      {siblings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Các biện chứng khác của {c.disease_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {siblings.map((s) => (
                <Link key={s.id} href={`/clinical-cases/${s.id}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-emerald-50">
                    {s.pattern ?? "(Chưa có tên)"}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Biện chứng & Pháp trị</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Biện chứng</p>
            <p className="font-medium">{c.pattern ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pháp trị</p>
            <p className="font-medium">{c.treatment_principle ?? "—"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Triệu chứng</p>
            <p className="whitespace-pre-wrap">{c.symptoms ?? "—"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Cách dùng</p>
            <p className="whitespace-pre-wrap">{c.usage_instruction ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Người tạo</p>
            <p className="font-medium">{c.created_by_name ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      {c.template_id && (
        <Card>
          <CardHeader>
            <CardTitle>
              Bài thuốc:{" "}
              <Link
                href={`/formulas/${c.template_id}`}
                className="text-emerald-800 hover:underline"
              >
                {c.template_name} ({c.template_code} v{c.template_version})
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length > 0 ? (
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
            ) : (
              <p className="text-sm text-muted-foreground">Bài thuốc chưa có vị thuốc.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Hiệu quả & Bàn luận</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Hiệu quả</p>
            <p className="whitespace-pre-wrap">{c.outcome ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Bàn luận</p>
            <p className="whitespace-pre-wrap">{c.discussion ?? "—"}</p>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
