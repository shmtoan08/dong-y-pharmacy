import { requireRole } from "@/lib/auth";
import { getPatientsExportData } from "@/features/patients/queries";

const SEX_LABEL: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

function age(dob: string | null): string {
  if (!dob) return "";
  const birth = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) a--;
  return a >= 0 ? String(a) : "";
}

function csvCell(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Xuất danh sách bệnh nhân (theo bộ lọc hiện tại) ra file CSV mở được bằng Excel */
export async function GET(req: Request) {
  await requireRole("admin", "practitioner", "dispenser");
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const sex = searchParams.get("sex") ?? undefined;
  const visit = searchParams.get("visit") ?? undefined;

  const rows = await getPatientsExportData({ q, sex, visit });

  const header = ["Mã BN", "Họ tên", "SĐT", "Giới tính", "Ngày sinh", "Tuổi", "Địa chỉ", "Số lần khám", "Lần khám gần nhất"];
  const lines = rows.map((r) => [
    csvCell(r.patient_code as string),
    csvCell(r.full_name as string),
    csvCell(r.phone as string | null),
    csvCell(r.sex ? (SEX_LABEL[r.sex as string] ?? (r.sex as string)) : ""),
    csvCell(r.date_of_birth ? new Date(r.date_of_birth as string).toLocaleDateString("vi-VN") : ""),
    csvCell(age(r.date_of_birth as string | null)),
    csvCell(r.address as string | null),
    csvCell(r.visit_count as number),
    csvCell(r.last_visit ? new Date(r.last_visit as string).toLocaleDateString("vi-VN") : ""),
  ].join(","));

  // BOM để Excel nhận UTF-8 tiếng Việt
  const csv = "\uFEFF" + [header.map(csvCell).join(","), ...lines].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="danh-sach-benh-nhan.csv"`,
    },
  });
}
