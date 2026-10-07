"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { redirect } from "next/navigation";

export interface ActionState {
  error?: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  tax_code: string | null;
  contact_name: string | null;
  contact_title: string | null;
  email: string | null;
  bank_account: string | null;
  bank_name: string | null;
  bank_owner: string | null;
  note: string | null;
  is_active: boolean;
}

const supplierSchema = z.object({
  name: z.string().min(1, "Tên nhà cung cấp là bắt buộc").max(200),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  tax_code: z.string().max(30).optional(),
  contact_name: z.string().max(100).optional(),
  contact_title: z.string().max(100).optional(),
  email: z.string().max(200).optional(),
  bank_account: z.string().max(50).optional(),
  bank_name: z.string().max(100).optional(),
  bank_owner: z.string().max(100).optional(),
  note: z.string().max(1000).optional(),
});

async function nextSupplierCode(): Promise<string> {
  const { rows } = await db.query<{ nextval: string }>(
    `SELECT nextval('supplier_seq') AS nextval`,
  );
  return `NCC-${String(rows[0].nextval).padStart(4, "0")}`;
}

export async function listSuppliers(activeOnly = false): Promise<Supplier[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<Supplier>(
    `SELECT id, code, name, phone, address, tax_code, contact_name, contact_title,
            email, bank_account, bank_name, bank_owner, note, is_active
     FROM suppliers ${activeOnly ? "WHERE is_active = true" : ""}
     ORDER BY name`,
  );
  return rows;
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<Supplier>(
    `SELECT id, code, name, phone, address, tax_code, contact_name, contact_title,
            email, bank_account, bank_name, bank_owner, note, is_active FROM suppliers WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createSupplier(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner");
  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    tax_code: formData.get("tax_code") || undefined,
    contact_name: formData.get("contact_name") || undefined,
    contact_title: formData.get("contact_title") || undefined,
    email: formData.get("email") || undefined,
    bank_account: formData.get("bank_account") || undefined,
    bank_name: formData.get("bank_name") || undefined,
    bank_owner: formData.get("bank_owner") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const v = parsed.data;
  const code = await nextSupplierCode();
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO suppliers (code, name, phone, address, tax_code, contact_name, contact_title,
                            email, bank_account, bank_name, bank_owner, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
    [code, v.name.trim(), v.phone?.trim() || null, v.address?.trim() || null,
     v.tax_code?.trim() || null, v.contact_name?.trim() || null, v.contact_title?.trim() || null,
     v.email?.trim() || null, v.bank_account?.trim() || null, v.bank_name?.trim() || null,
     v.bank_owner?.trim() || null, v.note?.trim() || null],
  );
  await audit({ userId: user.id, action: "supplier.create", tableName: "suppliers", rowId: rows[0].id, newValue: { code } });
  redirect("/suppliers");
}

export async function updateSupplier(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner");
  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    tax_code: formData.get("tax_code") || undefined,
    contact_name: formData.get("contact_name") || undefined,
    contact_title: formData.get("contact_title") || undefined,
    email: formData.get("email") || undefined,
    bank_account: formData.get("bank_account") || undefined,
    bank_name: formData.get("bank_name") || undefined,
    bank_owner: formData.get("bank_owner") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const v = parsed.data;
  await db.query(
    `UPDATE suppliers SET name = $1, phone = $2, address = $3, tax_code = $4,
                          contact_name = $5, contact_title = $6, email = $7,
                          bank_account = $8, bank_name = $9, bank_owner = $10,
                          note = $11, updated_at = NOW() WHERE id = $12`,
    [v.name.trim(), v.phone?.trim() || null, v.address?.trim() || null,
     v.tax_code?.trim() || null, v.contact_name?.trim() || null, v.contact_title?.trim() || null,
     v.email?.trim() || null, v.bank_account?.trim() || null, v.bank_name?.trim() || null,
     v.bank_owner?.trim() || null, v.note?.trim() || null, id],
  );
  await audit({ userId: user.id, action: "supplier.update", tableName: "suppliers", rowId: id, newValue: {} });
  redirect("/suppliers");
}

export async function toggleSupplierActive(id: string): Promise<void> {
  const user = await requireRole("admin", "practitioner");
  await db.query(
    `UPDATE suppliers SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1`,
    [id],
  );
  await audit({ userId: user.id, action: "supplier.toggle", tableName: "suppliers", rowId: id, newValue: {} });
}
