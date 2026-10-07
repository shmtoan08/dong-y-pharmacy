import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default async function FormulasListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const canEdit = user.role === "admin" || user.role === "practitioner";

  // Chỉ hiện version mới nhất của mỗi code
  const { rows } = await db.query(
    `SELECT DISTINCT ON (t.code) t.id, t.code, t.name, t.version, t.category,
            t.syndrome, t.is_active,
            (SELECT COUNT(*) FROM prescription_template_items i WHERE i.template_id = t.id) AS item_count
     FROM prescription_templates t
     WHERE ($1 = '' OR t.name ILIKE '%' || $1 || '%'
            OR t.syndrome ILIKE '%' || $1 || '%'
            OR t.indications ILIKE '%' || $1 || '%')
     ORDER BY t.code, t.version DESC`,
    [query],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bài thuốc</h1>
        {canEdit && (
          <Button asChild className="bg-emerald-800 hover:bg-emerald-900">
            <Link href="/formulas/new">Thêm bài thuốc</Link>
          </Button>
        )}
      </div>

      <form className="flex gap-2" method="GET">
        <Input
          name="q"
          placeholder="Tìm theo tên, hội chứng, chỉ định..."
          defaultValue={query}
          className="max-w-md"
        />
        <Button type="submit" variant="outline">
          Tìm
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>
            Danh sách ({rows.length})
            {query && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                — kết quả cho "{query}"
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tên bài thuốc</TableHead>
                <TableHead>Phân loại</TableHead>
                <TableHead>Hội chứng</TableHead>
                <TableHead className="text-center">Số vị</TableHead>
                <TableHead className="text-center">Ver</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {query
                      ? "Không tìm thấy bài thuốc nào."
                      : "Chưa có bài thuốc nào. Hãy thêm bài đầu tiên!"}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.code}</TableCell>
                  <TableCell>
                    <Link
                      href={`/formulas/${r.id}`}
                      className="font-medium text-emerald-800 hover:underline"
                    >
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell>{CATEGORY_LABEL[r.category] ?? r.category}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {r.syndrome ?? "—"}
                  </TableCell>
                  <TableCell className="text-center">{r.item_count}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">v{r.version}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.is_active ? "default" : "secondary"}
                      className={r.is_active ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : ""}>
                      {r.is_active ? "Đang dùng" : "Ngưng"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
