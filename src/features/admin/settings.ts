"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export interface ClinicSettings {
  clinic_name: string;
  clinic_address: string;
  clinic_phone: string;
  clinic_email: string;
  prescription_footer: string;
}

const DEFAULTS: ClinicSettings = {
  clinic_name: "ĐÔNG Y ĐƯỜNG",
  clinic_address: "",
  clinic_phone: "",
  clinic_email: "",
  prescription_footer: "Chúc quý khách mau khỏe!",
};

export async function getSettings(): Promise<ClinicSettings> {
  await requireRole("admin");
  const { rows } = await db.query<{ key: string; value: string }>(
    `SELECT key, value FROM system_settings`
  );
  const result = { ...DEFAULTS };
  for (const r of rows) {
    if (r.key in result) {
      (result as Record<string, string>)[r.key] = r.value ?? "";
    }
  }
  return result;
}

export async function updateSettings(
  data: Partial<ClinicSettings>
): Promise<{ error?: string }> {
  const user = await requireRole("admin");
  const allowed: (keyof ClinicSettings)[] = [
    "clinic_name", "clinic_address", "clinic_phone", "clinic_email", "prescription_footer",
  ];
  for (const key of allowed) {
    if (key in data) {
      await db.query(
        `INSERT INTO system_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, data[key] ?? ""]
      );
    }
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
