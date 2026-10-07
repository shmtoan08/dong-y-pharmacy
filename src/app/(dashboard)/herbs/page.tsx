import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

export default async function HerbsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; inactive?: string }>;
}) {
  await requireRole("admin", "practitioner", "dispenser");
  const { q, inactive } = await searchParams;
  const query = q?.trim() ?? "";
  const { normalizeHerbKey } = await import("@/lib/herb-key");
  const queryKey = normalizeHerbKey(query);

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (!inactive) {
    conditions.push("h.is_active = true");
  }
  if (query) {
    params.push(`%${query}%`);
    params.push(`%${queryKey}%`);
    conditions.push(`(h.name_common ILIKE $${params.length - 1} OR h.code ILIKE $${params.length - 1} OR h.canonical_key LIKE $${params.length})`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  interface HerbListRow {
    id: string; code: string; name_common: string;
    name_han_viet: string | null; property_tinh: string | null;
    property_vi: string | null; is_valuable: boolean;
    is_active: boolean; alias_count: string;
  }
  const { rows } = await db.query<HerbListRow>(
    `SELECT h.id, h.code, h.name_common, h.name_han_viet, h.property_tinh,
            h.property_vi, h.is_valuable, h.is_active,
            COUNT(a.id) AS alias_count
     FROM herbs h
     LEFT JOIN herb_aliases a ON a.herb_id = h.id
     ${where}
     GROUP BY h.id
     ORDER BY h.code
     LIMIT 200`,
    params,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Vị thuốc</h1>
          <p className="text-sm text-stone-500">Danh mục vị thuốc chuẩn hóa</p>
        </div>
        <div className="flex gap-2">
          <Link href="/herbs/migrate">
            <Button variant="outline" size="sm">Chuẩn hóa tên</Button>
          </Link>
          <Link href="/herbs/new">
            <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900">
              <Plus className="mr-1 h-4 w-4" /> Thêm vị thuốc
            </Button>
          </Link>
        </div>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Tìm theo tên hoặc mã..."
          className="w-full max-w-sm rounded-md border border-stone-200 px-3 py-2 text-sm"
        />
        <Button type="submit" variant="outline" size="sm">Tìm</Button>
      </form>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-stone-500">
              {query ? "Không tìm thấy vị thuốc nào." : "Chưa có vị thuốc nào."}
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {rows.map((h) => (
                <li key={h.id}>
                  <Link
                    href={`/herbs/${h.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-stone-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-900">
                        {h.name_common}
                        <span className="ml-2 font-mono text-xs text-stone-500">{h.code}</span>
                        {h.is_valuable && (
                          <Badge variant="outline" className="ml-2 border-amber-300 text-amber-700">
                            Quý
                          </Badge>
                        )}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        {[h.name_han_viet, h.property_tinh, h.property_vi].filter(Boolean).join(" · ")}
                        {Number(h.alias_count) > 0 && ` · ${h.alias_count} tên khác`}
                      </p>
                    </div>
                    {!h.is_active && (
                      <Badge variant="secondary" className="shrink-0">Ngưng</Badge>
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
