"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { normalizeHerbKey } from "@/lib/herb-key";
import { herbSchema, aliasSchema } from "./schemas";
import { herbImageKey, herbImageUrl, uploadToR2 } from "@/lib/r2";

import type { ActionState } from "@/types/action-state";
export type { ActionState };

import {
  searchHerbs as searchHerbsQuery,
  getHerb as getHerbQuery,
  getHerbAliases as getHerbAliasesQuery,
  getMappings as getMappingsQuery,
  getMappingStats as getMappingStatsQuery,
  type Herb,
  type HerbAlias,
  type HerbDetail,
  type MappingRow,
} from "./queries";

export type { Herb, HerbAlias, HerbDetail, MappingRow };

/** Tìm kiếm vị thuốc (cho autocomplete khi kê đơn): khớp tên, mã, key, alias */
export async function searchHerbs(query: string, limit = 10): Promise<Herb[]> {
  return searchHerbsQuery(query, limit);
}

export async function getHerb(
  id: string,
): Promise<(Herb & { aliases: HerbAlias[] }) | null> {
  return getHerbQuery(id);
}

export async function getHerbAliases(herbId: string): Promise<HerbAlias[]> {
  return getHerbAliasesQuery(herbId);
}

export async function createHerb(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner");
  const parsed = herbSchema.safeParse({
    name_common: formData.get("name_common"),
    name_han_viet: formData.get("name_han_viet") || undefined,
    name_science: formData.get("name_science") || undefined,
    used_part: formData.get("used_part") || undefined,
    property_tinh: formData.get("property_tinh") || undefined,
    property_vi: formData.get("property_vi") || undefined,
    quy_kinh: formData.get("quy_kinh") || undefined,
    cong_nang: formData.get("cong_nang") || undefined,
    kieng_ky: formData.get("kieng_ky") || undefined,
    vi_tri_hoc_tu: formData.get("vi_tri_hoc_tu") || undefined,
    base_unit: formData.get("base_unit") || "gram",
    price_per_unit: formData.get("price_per_unit") || undefined,
    min_stock_quantity: formData.get("min_stock_quantity") || undefined,
    is_valuable: formData.get("is_valuable") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const v = parsed.data;
  const key = normalizeHerbKey(v.name_common);

  // Kiểm tra trùng key với herb khác hoặc alias của herb khác
  const { rows: dup } = await db.query(
    `SELECT 'herb' AS kind, name_common AS name FROM herbs WHERE canonical_key = $1
     UNION ALL
     SELECT 'alias', h.name_common FROM herb_aliases a JOIN herbs h ON h.id = a.herb_id WHERE a.alias_key = $1`,
    [key],
  );
  if (dup.length > 0) {
    return { error: `Tên này trùng với "${dup[0].name}" trong danh mục` };
  }

  const quyKinh = v.quy_kinh
    ? v.quy_kinh.split(",").map((s) => s.trim()).filter(Boolean)
    : null;
  const { rows } = await db.query<{ id: string; code: string }>(
    `INSERT INTO herbs (code, name_common, canonical_key, name_han_viet, name_science,
                        used_part, property_tinh, property_vi, quy_kinh, cong_nang,
                        kieng_ky, vi_tri_hoc_tu,
                        base_unit, price_per_unit, min_stock_quantity, is_valuable)
     VALUES (next_herb_code(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING id, code`,
    [v.name_common, key, v.name_han_viet ?? null, v.name_science ?? null,
     v.used_part ?? null, v.property_tinh ?? null, v.property_vi ?? null,
     quyKinh, v.cong_nang ?? null, v.kieng_ky ?? null, v.vi_tri_hoc_tu ?? null, v.base_unit,
     v.price_per_unit ?? null, v.min_stock_quantity ?? 0,
     v.is_valuable],
  );
  await audit({ userId: user.id, action: "herb.create", tableName: "herb", rowId: rows[0].id, newValue: { code: rows[0].code } });
  if (formData.get("_stay") === "1") {
    return { ok: true, code: rows[0].code, name: v.name_common };
  }
  redirect(`/herbs/${rows[0].id}`);
}

export async function updateHerb(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner");
  const parsed = herbSchema.safeParse({
    name_common: formData.get("name_common"),
    name_han_viet: formData.get("name_han_viet") || undefined,
    name_science: formData.get("name_science") || undefined,
    used_part: formData.get("used_part") || undefined,
    property_tinh: formData.get("property_tinh") || undefined,
    property_vi: formData.get("property_vi") || undefined,
    quy_kinh: formData.get("quy_kinh") || undefined,
    cong_nang: formData.get("cong_nang") || undefined,
    kieng_ky: formData.get("kieng_ky") || undefined,
    vi_tri_hoc_tu: formData.get("vi_tri_hoc_tu") || undefined,
    base_unit: formData.get("base_unit") || "gram",
    price_per_unit: formData.get("price_per_unit") || undefined,
    min_stock_quantity: formData.get("min_stock_quantity") || undefined,
    is_valuable: formData.get("is_valuable") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const v = parsed.data;
  const key = normalizeHerbKey(v.name_common);

  // Trùng key với herb khác hoặc alias (kể cả alias của chính nó cũng không được trùng key mới)
  const { rows: dup } = await db.query(
    `SELECT name_common AS name FROM herbs WHERE canonical_key = $1 AND id <> $2
     UNION ALL
     SELECT h.name_common FROM herb_aliases a JOIN herbs h ON h.id = a.herb_id
     WHERE a.alias_key = $1 AND a.herb_id <> $2`,
    [key, id],
  );
  if (dup.length > 0) {
    return { error: `Tên này trùng với "${dup[0].name}" trong danh mục` };
  }

  const quyKinh = v.quy_kinh
    ? v.quy_kinh.split(",").map((s) => s.trim()).filter(Boolean)
    : null;
  await db.query(
    `UPDATE herbs SET name_common = $1, canonical_key = $2, name_han_viet = $3,
                      name_science = $4, used_part = $5, property_tinh = $6,
                      property_vi = $7, quy_kinh = $8, cong_nang = $9,
                      kieng_ky = $10, vi_tri_hoc_tu = $11,
                      base_unit = $12, price_per_unit = $13,
                      min_stock_quantity = $14, is_valuable = $15, updated_at = NOW()
     WHERE id = $16`,
    [v.name_common, key, v.name_han_viet ?? null, v.name_science ?? null,
     v.used_part ?? null, v.property_tinh ?? null, v.property_vi ?? null,
     quyKinh, v.cong_nang ?? null, v.kieng_ky ?? null, v.vi_tri_hoc_tu ?? null, v.base_unit,
     v.price_per_unit ?? null, v.min_stock_quantity ?? 0,
     v.is_valuable, id],
  );
  await audit({ userId: user.id, action: "herb.update", tableName: "herb", rowId: id, newValue: {} });
  redirect(`/herbs/${id}`);
}

export async function toggleHerbActive(id: string): Promise<void> {
  const user = await requireRole("admin", "practitioner");
  await db.query(`UPDATE herbs SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1`, [id]);
  await audit({ userId: user.id, action: "herb.toggle_active", tableName: "herb", rowId: id, newValue: {} });
}

export async function addAlias(
  herbId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner");
  const parsed = aliasSchema.safeParse({ alias_name: formData.get("alias_name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const key = normalizeHerbKey(parsed.data.alias_name);

  // Alias key phải unique toàn cục, và không trùng canonical_key của herb khác
  const { rows: dup } = await db.query(
    `SELECT h.name_common AS name FROM herb_aliases a JOIN herbs h ON h.id = a.herb_id WHERE a.alias_key = $1
     UNION ALL
     SELECT name_common FROM herbs WHERE canonical_key = $1 AND id <> $2`,
    [key, herbId],
  );
  if (dup.length > 0) {
    return { error: `Tên khác này trùng với "${dup[0].name}" trong danh mục` };
  }

  try {
    await db.query(
      `INSERT INTO herb_aliases (herb_id, alias_name, alias_key) VALUES ($1, $2, $3)`,
      [herbId, parsed.data.alias_name, key],
    );
  } catch {
    return { error: "Tên khác này đã tồn tại" };
  }
  await audit({ userId: user.id, action: "herb.add_alias", tableName: "herb", rowId: herbId, newValue: { alias: parsed.data.alias_name } });
  return {};
}

export async function removeAlias(herbId: string, aliasId: string): Promise<void> {
  const user = await requireRole("admin", "practitioner");
  await db.query(`DELETE FROM herb_aliases WHERE id = $1 AND herb_id = $2`, [aliasId, herbId]);
  await audit({ userId: user.id, action: "herb.remove_alias", tableName: "herb", rowId: herbId, newValue: { aliasId } });
}

// ---------- Migrate ----------


/**
 * Quét text vị thuốc từ bài mẫu + đơn thuốc, tạo mapping.
 * Khớp chính xác canonical_key/alias_key → confidence 1.00 (vẫn pending, chờ duyệt).
 */
export async function scanHerbMappings(): Promise<{ scanned: number; newMappings: number }> {
  const user = await requireRole("admin", "practitioner");

  // Lấy tất cả text distinct từ 2 nguồn
  const { rows: texts } = await db.query<{ herb_name: string }>(
    `SELECT DISTINCT herb_name FROM prescription_template_items
     UNION
     SELECT DISTINCT herb_name FROM prescription_items`,
  );

  let created = 0;
  for (const t of texts) {
    const key = normalizeHerbKey(t.herb_name);
    // Thử khớp với herbs hoặc alias
    const { rows: match } = await db.query<{ id: string }>(
      `SELECT id FROM herbs WHERE canonical_key = $1 AND is_active = true
       UNION ALL
       SELECT herb_id AS id FROM herb_aliases WHERE alias_key = $1
       LIMIT 1`,
      [key],
    );
    const herbId = match.length > 0 ? match[0].id : null;
    const { rowCount } = await db.query(
      `INSERT INTO herb_migration_mappings (source_text, normalized_key, herb_id, confidence)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (source_text, normalized_key) DO NOTHING`,
      [t.herb_name, key, herbId, herbId ? "1.00" : null],
    );
    created += rowCount ?? 0;
  }

  await audit({ userId: user.id, action: "herb.scan_mappings", tableName: "herb_migration", rowId: "", newValue: {
    scanned: texts.length,
    newMappings: created,
  } });
  return { scanned: texts.length, newMappings: created };
}

export async function getMappings(status?: string): Promise<MappingRow[]> {
  return getMappingsQuery(status);
}

export async function confirmMapping(mappingId: string, herbId: string): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner");
  // Không cho confirm nếu herb inactive
  const { rows: h } = await db.query(`SELECT is_active FROM herbs WHERE id = $1`, [herbId]);
  if (h.length === 0 || !h[0].is_active) {
    return { error: "Vị thuốc không tồn tại hoặc đã ngưng dùng" };
  }
  await db.query(
    `UPDATE herb_migration_mappings
     SET herb_id = $1, status = 'confirmed', reviewed_by = $2, reviewed_at = NOW()
     WHERE id = $3`,
    [herbId, user.id, mappingId],
  );
  await audit({ userId: user.id, action: "herb.confirm_mapping", tableName: "herb_migration", rowId: mappingId, newValue: { herbId } });
  return {};
}

export async function rejectMapping(mappingId: string, reason?: string): Promise<ActionState> {
  const user = await requireRole("admin", "practitioner");
  await db.query(
    `UPDATE herb_migration_mappings
     SET status = 'rejected', rejection_reason = $1, reviewed_by = $2, reviewed_at = NOW()
     WHERE id = $3`,
    [reason || null, user.id, mappingId],
  );
  await audit({ userId: user.id, action: "herb.reject_mapping", tableName: "herb_migration", rowId: mappingId, newValue: {} });
  return {};
}

export async function getMappingStats(): Promise<{
  pending: number;
  confirmed: number;
  rejected: number;
  total: number;
}> {
  return getMappingStatsQuery();
}

const HERB_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const HERB_IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB

/** Upload ảnh vị thuốc lên R2 + lưu image_url. Key: herbs/<canonical_key> (ghi đè khi upload lại). */
export async function uploadHerbImage(
  herbId: string,
  formData: FormData,
): Promise<ActionState<{ image_url: string }>> {
  const user = await requireRole("admin", "practitioner");
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Chưa chọn ảnh." };
  }
  if (!HERB_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, error: "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP." };
  }
  if (file.size > HERB_IMAGE_MAX_SIZE) {
    return { ok: false, error: "Ảnh tối đa 5MB." };
  }
  const herb = await getHerbQuery(herbId);
  if (!herb) return { ok: false, error: "Không tìm thấy vị thuốc." };
  try {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const key = herbImageKey(herb.canonical_key);
    await uploadToR2(key, buffer, file.type);
    const imageUrl = herbImageUrl(herb.canonical_key);
    await db.query(`UPDATE herbs SET image_url = $1, updated_at = NOW() WHERE id = $2`, [
      imageUrl,
      herbId,
    ]);
    await audit({
      userId: user.id,
      action: "UPDATE_HERB_IMAGE",
      tableName: "herbs",
      rowId: herbId,
      newValue: { image_url: imageUrl },
    });
    const { revalidatePath } = await import("next/cache");
    revalidatePath(`/herbs/${herbId}`);
    revalidatePath("/herbs");
    return { ok: true, data: { image_url: imageUrl } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Tải ảnh lên thất bại.";
    return { ok: false, error: msg };
  }
}
