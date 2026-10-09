"use server";

import { z } from "zod";
import { db, withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

const SettingsSchema = z.object({
  clinic_name: z.string().min(1, "Tên phòng khám không được để trống.").max(100),
  clinic_address: z.string().max(200).optional().default(""),
  clinic_phone: z.string().max(20).optional().default(""),
  clinic_email: z.string().email("Email không hợp lệ.").max(100).optional().or(z.literal("")).default(""),
  clinic_license_number: z.string().max(50).optional().default(""),
  clinic_manager: z.string().max(100).optional().default(""),
  prescription_footer: z.string().max(500).optional().default(""),
});

export type ClinicSettings = z.infer<typeof SettingsSchema>;

const DEFAULTS: ClinicSettings = {
  clinic_name: "ĐÔNG Y ĐƯỜNG",
  clinic_address: "",
  clinic_phone: "",
  clinic_email: "",
  clinic_license_number: "",
  clinic_manager: "",
  prescription_footer: "Chúc quý khách mau khỏe!",
};

const ALLOWED_KEYS = Object.keys(DEFAULTS) as (keyof ClinicSettings)[];

export async function getSettings(): Promise<ClinicSettings> {
  await requireRole("admin");
  const { rows } = await db.query<{ key: string; value: string }>(
    `SELECT key, value FROM system_settings`
  );
  const result = { ...DEFAULTS };
  for (const r of rows) {
    if (ALLOWED_KEYS.includes(r.key as keyof ClinicSettings)) {
      (result as Record<string, string>)[r.key] = r.value ?? "";
    }
  }
  return result;
}

export async function updateSettings(
  data: Partial<ClinicSettings>
): Promise<{ error?: string }> {
  const user = await requireRole("admin");

  // Validate
  const parsed = SettingsSchema.safeParse({ ...DEFAULTS, ...data });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const valid = parsed.data;

  // Transaction: tất cả hoặc không gì cả
  try {
    await withTransaction(async (tx) => {
      for (const key of ALLOWED_KEYS) {
        if (key in data) {
          await tx.query(
            `INSERT INTO system_settings (key, value, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
            [key, valid[key]]
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

/** Lấy tên phòng khám cho header/print (không cần admin) */
export async function getClinicName(): Promise<string> {
  const { rows } = await db.query<{ value: string }>(
    `SELECT value FROM system_settings WHERE key = 'clinic_name'`
  );
  return rows[0]?.value || "ĐÔNG Y ĐƯỜNG";
}
