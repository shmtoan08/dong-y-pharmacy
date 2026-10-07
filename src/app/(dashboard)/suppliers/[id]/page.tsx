import { BackButton } from "@/components/shared/BackButton";
import { SimpleTabs } from "@/components/shared/SimpleTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { getSupplier } from "@/features/suppliers/actions";
import { listReceipts } from "@/features/inventory/actions";
import { getSessionUser } from "@/lib/auth";
import { notFound } from "next/navigation";

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <p className="text-sm">
      <span className="font-medium text-stone-500">{label}:</span>{" "}
      <span className="text-stone-800">{value}</span>
    </p>
  );
}

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [supplier, user] = await Promise.all([getSupplier(id), getSessionUser()]);
  if (!supplier || !user) notFound();

  const canEdit = user.role === "admin" || user.role === "practitioner";
  const receipts = (await listReceipts()).filter((r) => r.supplier_id === id);

  const totalPurchased = receipts
    .filter((r) => r.status === "confirmed")
    .reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);

  const infoTab = (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Thông tin liên hệ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Field label="Tên" value={supplier.name} />
          <Field label="Mã số thuế" value={supplier.tax_code} />
          <Field label="Người liên hệ" value={supplier.contact_name} />
          <Field label="Chức vụ" value={supplier.contact_title} />
          <Field label="SĐT" value={supplier.phone} />
          <Field label="Email" value={supplier.email} />
          <Field label="Địa chỉ" value={supplier.address} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Thông tin thanh toán</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Field label="Số tài khoản" value={supplier.bank_account} />
          <Field label="Ngân hàng" value={supplier.bank_name} />
          <Field label="Chủ tài khoản" value={supplier.bank_owner} />
          <Field label="Ghi chú" value={supplier.note} />
        </CardContent>
      </Card>
    </div>
  );

  const historyTab = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Lịch sử nhập kho ({receipts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {receipts.length === 0 ? (
          <p className="p-4 text-center text-sm text-stone-500">
            Chưa có phiếu nhập nào từ nhà cung cấp này.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-stone-600">Mã phiếu</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Ngày nhập</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Tổng tiền</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/stock-receipts/${r.id}`}
                        className="font-mono text-xs font-medium hover:text-emerald-700 hover:underline"
                      >
                        {r.receipt_code}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-stone-600">
                      {new Date(r.received_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {r.total_amount
                        ? `${Number(r.total_amount).toLocaleString("vi-VN")} đ`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        className={
                          r.status === "confirmed"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "draft"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-stone-200 text-stone-600"
                        }
                      >
                        {r.status === "confirmed"
                          ? "Đã nhập kho"
                          : r.status === "draft"
                            ? "Nháp"
                            : "Đã hủy"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const debtTab = (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-stone-500">Tổng tiền đã nhập</p>
          <p className="mt-1 text-xl font-bold text-stone-900">
            {totalPurchased.toLocaleString("vi-VN")} đ
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-stone-500">Đã thanh toán</p>
          <p className="mt-1 text-xl font-bold text-stone-400">—</p>
          <p className="mt-1 text-xs text-stone-400">Chưa có module thanh toán</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-stone-500">Công nợ còn lại</p>
          <p className="mt-1 text-xl font-bold text-stone-400">—</p>
          <p className="mt-1 text-xs text-stone-400">Chưa có module thanh toán</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-4">
      <BackButton href="/suppliers" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-stone-900 md:text-2xl">
            {supplier.name}
            <Badge className={supplier.is_active ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"}>
              {supplier.is_active ? "Đang hợp tác" : "Tạm ngưng"}
            </Badge>
          </h1>
          <p className="text-sm text-stone-500">{supplier.code}</p>
        </div>
        {canEdit && (
          <Link href={`/suppliers/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-1 h-4 w-4" /> Sửa
            </Button>
          </Link>
        )}
      </div>

      <SimpleTabs
        tabs={[
          { id: "info", label: "Thông tin", content: infoTab },
          { id: "history", label: "Lịch sử nhập kho", count: receipts.length, content: historyTab },
          { id: "debt", label: "Công nợ", content: debtTab },
        ]}
      />
    </div>
  );
}
