import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLotDetail, getLotHistory } from "@/features/inventory/actions";
import { getSessionUser } from "@/lib/auth";
import { LotActions } from "./LotActions";
import { notFound } from "next/navigation";
import Link from "next/link";

function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <p className="text-sm">
      <span className="font-medium text-stone-500">{label}:</span>{" "}
      <span className={mono ? "font-mono" : "text-stone-800"}>{value}</span>
    </p>
  );
}

const ACTION_LABEL: Record<string, string> = {
  "lot.adjust": "Điều chỉnh tồn kho",
  "lot.discard": "Hủy / thanh lý lô",
};

export default async function LotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lot, user, history] = await Promise.all([
    getLotDetail(id),
    getSessionUser(),
    getLotHistory(id),
  ]);
  if (!lot || !user) notFound();

  const canAct = user.role === "admin" || user.role === "practitioner";
  const pct = lot.quantity_initial
    ? Math.round((Number(lot.quantity_current) / Number(lot.quantity_initial)) * 100)
    : null;

  return (
    <div className="space-y-4">
      <BackButton href="/stock-lots" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold text-stone-900 md:text-2xl">
            {lot.lot_code}
          </h1>
          <p className="text-sm text-stone-500">
            {lot.herb_name} ({lot.herb_code})
          </p>
        </div>
        {canAct && (
          <LotActions lotId={id} currentQty={Number(lot.quantity_current)} baseUnit={lot.base_unit} />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Thông tin lô</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Field label="Vị thuốc" value={`${lot.herb_name} (${lot.herb_code})`} />
            <Field label="Nhà cung cấp" value={lot.supplier_name} />
            <Field
              label="Phiếu nhập"
              value={lot.receipt_code}
              mono
            />
            {lot.receipt_id && (
              <p className="text-sm">
                <Link href={`/stock-receipts/${lot.receipt_id}`} className="text-emerald-700 hover:underline">
                  Xem phiếu nhập →
                </Link>
              </p>
            )}
            <Field
              label="Ngày nhập"
              value={lot.receipt_date ? new Date(lot.receipt_date).toLocaleDateString("vi-VN") : null}
            />
            <Field
              label="Hạn sử dụng"
              value={lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString("vi-VN") : "Không HSD"}
            />
            <Field label="Số lô NCC" value={lot.supplier_lot_code} mono />
            <Field label="Vị trí kho" value={lot.storage_location} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tồn kho lô</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold text-stone-900">
              {Number(lot.quantity_current).toLocaleString("vi-VN")}
              <span className="ml-1 text-base font-normal text-stone-500">{lot.base_unit}</span>
            </p>
            <p className="text-sm text-stone-500">
              Nhập ban đầu: {Number(lot.quantity_initial).toLocaleString("vi-VN")} {lot.base_unit}
              {pct !== null && ` · Còn ${pct}%`}
            </p>
            {Number(lot.quantity_current) <= 0 && (
              <Badge className="bg-stone-200 text-stone-600">Đã hết / đã hủy</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Lịch sử biến động ({history.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-4 text-center text-sm text-stone-500">
              Chưa có biến động nào được ghi nhận.
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((h, idx) => (
                <div key={idx} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{ACTION_LABEL[h.action] ?? h.action}</p>
                    <p className="text-xs text-stone-500">
                      {h.user_name ?? "Hệ thống"} ·{" "}
                      {new Date(h.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  {h.new_value != null && (
                    <p className="text-xs text-stone-500">
                      {typeof h.new_value === "object" ? JSON.stringify(h.new_value) : String(h.new_value)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
