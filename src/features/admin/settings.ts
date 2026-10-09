"use server";

import { z } from "zod";
import { db, withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

const SettingsSchema = z.object({
  // Thông tin phòng khám
  clinic_name: z.string().min(1, "Tên phòng khám không được để trống.").max(100),
  clinic_address: z.string().max(200).optional().default(""),
  clinic_phone: z.string().max(20).optional().default(""),
  clinic_email: z.string().email("Email không hợp lệ.").max(100).optional().or(z.literal("")).default(""),
  clinic_license_number: z.string().max(50).optional().default(""),
  clinic_manager: z.string().max(100).optional().default(""),
  clinic_logo_url: z.string().max(500000).optional().default(""),
  // Mẫu in
  prescription_footer: z.string().max(500).optional().default(""),
  decoction_instructions: z.string().max(2000).optional().default(""),
  print_paper_size: z.enum(["A4", "A5", "K80"]).optional().default("A5"),
  print_show_logo: z.enum(["true", "false"]).optional().default("true"),
  print_show_qr: z.enum(["true", "false"]).optional().default("true"),
  // Kho
  stock_expiry_warning_days: z.coerce.number().int().min(1).max(365).optional().default(30),
  stock_min_threshold: z.coerce.number().min(0).optional().default(0),
  // Đặt lịch
  max_queue_per_day: z.coerce.number().int().min(1).max(500).optional().default(50),
  // Thanh toán
  bank_name: z.string().max(100).optional().default(""),
  bank_account_number: z.string().max(30).optional().default(""),
  bank_account_holder: z.string().max(100).optional().default(""),
});

export type ClinicSettings = z.infer<typeof SettingsSchema>;

const DEFAULTS: ClinicSettings = {
  clinic_name: "ĐÔNG Y ĐƯỜNG",
  clinic_address: "",
  clinic_phone: "",
  clinic_email: "",
  clinic_license_number: "",
  clinic_manager: "",
  clinic_logo_url: "",
  prescription_footer: "Chúc quý khách mau khỏe!",
  decoction_instructions: "- Nước 1: Đổ 3 bát nước sắc lấy 1 bát, uống ấm sau ăn sáng 30 phút.\n- Nước 2: Đổ 2 bát nước sắc lấy nửa bát, uống ấm sau ăn tối.\n- Kiêng ăn đồ cay nóng, tanh, chất kích thích trong thời gian dùng thuốc.",
  print_paper_size: "A5",
  print_show_logo: "true",
  print_show_qr: "true",
  stock_expiry_warning_days: 30,
  stock_min_threshold: 0,
  max_queue_per_day: 50,
  bank_name: "",
  bank_account_number: "",
  bank_account_holder: "",
};

const ALLOWED_KEYS = Object.keys(DEFAULTS) as (keyof ClinicSettings)[];

export async function getSettings(): Promise<ClinicSettings> {
  await requireRole("admin");
  const { rows } = await db.query<{ key: string; value: string }>(
    `SELECT key, value FROM system_settings`
  );
  const result: Record<string, unknown> = { ...DEFAULTS };
  for (const r of rows) {
    if (ALLOWED_KEYS.includes(r.key as keyof ClinicSettings)) {
      const key = r.key as keyof ClinicSettings;
      // Parse number fields
      if (key === "stock_expiry_warning_days" || key === "stock_min_threshold") {
        result[key] = Number(r.value) || DEFAULTS[key];
      } else {
        result[key] = r.value ?? "";
      }
    }
  }
  return result as ClinicSettings;
}

export async function updateSettings(
  data: Partial<ClinicSettings>
): Promise<{ error?: string }> {
  const user = await requireRole("admin");

  const parsed = SettingsSchema.safeParse({ ...DEFAULTS, ...data });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const valid = parsed.data;

  try {
    await withTransaction(async (tx) => {
      for (const key of ALLOWED_KEYS) {
        if (key in data) {
          await tx.query(
            `INSERT INTO system_settings (key, value, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
            [key, String(valid[key])]
          );
        }
      }
    });
  } catch {
    return { error: "Lưu thất bại, vui lòng thử lại." };
  }

  await audit({ userId: user.id, action: "SETTINGS_UPDATE", tableName: "system_settings", rowId: "clinic" });
  return {};
}

export async function resetSettings(): Promise<{ error?: string }> {
  const user = await requireRole("admin");
  try {
    await withTransaction(async (tx) => {
      for (const key of ALLOWED_KEYS) {
        await tx.query(
          `INSERT INTO system_settings (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, String(DEFAULTS[key])]
        );
      }
    });
  } catch {
    return { error: "Khôi phục thất bại." };
  }
  await audit({ userId: user.id, action: "SETTINGS_RESET", tableName: "system_settings", rowId: "clinic" });
  return {};
}

/** Lấy tên phòng khám cho header/print */
export async function getClinicName(): Promise<string> {
  const { rows } = await db.query<{ value: string }>(
    `SELECT value FROM system_settings WHERE key = 'clinic_name'`
  );
  return rows[0]?.value || "ĐÔNG Y ĐƯỜNG";
}

/** Lấy settings công khai cho mẫu in (logo, QR, footer) */
export async function getPrintSettings(): Promise<{
  clinic_name: string;
  clinic_logo_url: string;
  print_show_logo: boolean;
  print_show_qr: boolean;
  prescription_footer: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
}> {
  const { rows } = await db.query<{ key: string; value: string }>(
    `SELECT key, value FROM system_settings WHERE key IN
     ('clinic_name', 'clinic_logo_url', 'print_show_logo', 'print_show_qr',
      'prescription_footer', 'bank_name', 'bank_account_number', 'bank_account_holder')`
  );
  const m: Record<string, string> = {};
  for (const r of rows) m[r.key] = r.value ?? "";
  return {
    clinic_name: m.clinic_name || "ĐÔNG Y ĐƯỜNG",
    clinic_logo_url: m.clinic_logo_url || "",
    print_show_logo: m.print_show_logo !== "false",
    print_show_qr: m.print_show_qr !== "false",
    prescription_footer: m.prescription_footer || "",
    bank_name: m.bank_name || "",
    bank_account_number: m.bank_account_number || "",
    bank_account_holder: m.bank_account_holder || "",
  };
}
