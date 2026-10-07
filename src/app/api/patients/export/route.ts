import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

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
  const q = (searchParams.get("q") ?? "").trim();
  const sexFilter = ["male", "female", "other"].includes(searchParams.get("sex") ?? "")
    ? searchParams.get("sex")!
    : "all";
  const visitFilter = ["month", "stale", "never"].includes(searchParams.get("visit") ?? "")
    ? searchParams.get("visit")!
    : "all";

  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (q) {
    where.push(`(p.full_name ILIKE $${i} OR p.phone ILIKE $${i} OR p.patient_code ILIKE $${i} OR p.address ILIKE $${i})`);
    params.push(`%${q}%`);
    i++;
  }
  if (sexFilter !== "all") {
    where.push(`p.sex = $${i}`);
    params.push(sexFilter);
    i++;
  }
  if (visitFilter === "month") {
    where.push(`vs.last_visit >= date_trunc('month', now())`);
  } else if (visitFilter === "stale") {
    where.push(`vs.last_visit IS NOT NULL AND vs.last_visit < now() - interval '6 months'`);
  } else if (visitFilter === "never") {
    where.push(`vs.last_visit IS NULL`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const res = await db.query(
    `SELECT p.patient_code, p.full_name, p.phone, p.sex, p.date_of_birth, p.address,
            COALESCE(vs.cnt, 0)::int AS visit_count, vs.last_visit
     FROM patients p
     LEFT JOIN (SELECT patient_id, COUNT(*) AS cnt, MAX(visited_at) AS last_visit FROM visits GROUP BY patient_id) vs
       ON vs.patient_id = p.id
     ${whereSql}
     ORDER BY p.created_at DESC`,
    params,
  );

  const header = ["Mã BN", "Họ tên", "SĐT", "Giới tính", "Ngày sinh", "Tuổi", "Địa chỉ", "Số lần khám", "Lần khám gần nhất"];
  const lines = res.rows.map((r: Record<string, unknown>) => [
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
