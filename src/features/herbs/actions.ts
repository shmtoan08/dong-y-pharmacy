"use server";

import { redirect } from "next/navigation";
import { db, withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { normalizeHerbKey } from "@/lib/herb-key";
import { herbSchema, aliasSchema } from "./schemas";
import { herbImageKey, herbImageUrl, uploadToR2, deleteFromR2, detectImageType, legacyHerbImageKey } from "@/lib/r2";

import type { ActionState } from "@/types/action-state";
export type { ActionState };

import {
  searchHerbs as searchHerbsQuery,
  getHerb as getHerbQuery,
  getHerbAliases as getHerbAliasesQuery,
  getMappings as getMappingsQuery,
  getMappingStats as getMappingStatsQuery,
  getHerbImages as getHerbImagesQuery,
  type Herb,
  type HerbAlias,
  type HerbDetail,
  type HerbImage,
  type MappingRow,
} from "./queries";

export type { Herb, HerbAlias, HerbDetail, HerbImage, MappingRow };

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

export async function getHerbImages(herbId: string): Promise<HerbImage[]> {
  return getHerbImagesQuery(herbId);
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
    return { ok: true, code: rows[0].code, name: v.name_common, data: { id: rows[0].id } };
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
  // canonical_key BAT BIEN: khong doi khi doi ten (anh R2 + mapping dung key nay).
  // Neu doi ten, ten cu nen duoc them lam alias de search van tim thay (nguoi dung them tay).
  await db.query(
    `UPDATE herbs SET name_common = $1, name_han_viet = $2,
                      name_science = $3, used_part = $4, property_tinh = $5,
                      property_vi = $6, quy_kinh = $7, cong_nang = $8,
                      kieng_ky = $9, vi_tri_hoc_tu = $10,
                      base_unit = $11, price_per_unit = $12,
                      min_stock_quantity = $13, is_valuable = $14, updated_at = NOW()
     WHERE id = $15`,
    [v.name_common, v.name_han_viet ?? null, v.name_science ?? null,
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
const HERB_IMAGE_MAX_COUNT = 5; // Tối đa 5 ảnh / vị thuốc

/** Danh sách ảnh mới nhất sau khi thay đổi (để UI cập nhật không cần reload). */
async function freshImages(herbId: string): Promise<HerbImage[]> {
  return getHerbImagesQuery(herbId);
}

/**
 * Upload 1..n ảnh cho vị thuốc (tối đa 5 ảnh / vị).
 * Mỗi ảnh 1 key R2 riêng (herbs/<canonical_key>/<image_id>) → URL mới → không bị cache cũ
 * (trước đây ghi đè chung 1 key nên upload xong trang vẫn hiện ảnh cũ).
 * All-or-nothing: lỗi ở ảnh nào → rollback toàn bộ (xóa row + file R2 đã upload trong lần này)
 * để thử lại không bị trùng.
 */
export async function uploadHerbImages(
  herbId: string,
  formData: FormData,
): Promise<ActionState<{ images: HerbImage[] }>> {
  const user = await requireRole("admin", "practitioner");
  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "Chưa chọn ảnh." };
  for (const file of files) {
    if (!HERB_IMAGE_TYPES.includes(file.type)) {
      return { ok: false, error: `File "${file.name}" không phải JPG/PNG/WebP.` };
    }
    if (file.size > HERB_IMAGE_MAX_SIZE) {
      return { ok: false, error: `File "${file.name}" vượt quá 5MB.` };
    }
  }
  const herb = await getHerbQuery(herbId);
  if (!herb) return { ok: false, error: "Không tìm thấy vị thuốc." };

  // Bảng herb_images chưa có (production chưa áp dụng migration) → báo rõ, không crash.
  let realCount: number;
  try {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM herb_images WHERE herb_id = $1`,
      [herbId],
    );
    realCount = Number(rows[0]?.count ?? 0);
  } catch (e) {
    if ((e as { code?: string })?.code === "42P01") {
      return { ok: false, error: "Chưa áp dụng migration bảng herb_images, hãy áp dụng migration rồi thử lại." };
    }
    throw e;
  }
  if (realCount + files.length > HERB_IMAGE_MAX_COUNT) {
    return { ok: false, error: `Tối đa ${HERB_IMAGE_MAX_COUNT} ảnh / vị thuốc (đã có ${realCount}).` };
  }

  const created: { id: string; key: string }[] = [];
  try {
    await withTransaction(async (tx) => {
      // Lazy migrate ảnh cũ (herbs.image_url, key cũ herbs/<canonical_key>) thành row đầu tiên.
      if (realCount === 0 && herb.image_url) {
        await tx.query(
          `INSERT INTO herb_images (herb_id, image_url, r2_key, sort_order, is_primary)
           VALUES ($1, $2, $3, 0, true)`,
          [herbId, herb.image_url, legacyHerbImageKey(herb.canonical_key)],
        );
        realCount = 1;
      }
      const { rows: maxRows } = await tx.query<{ m: number }>(
        `SELECT COALESCE(MAX(sort_order), -1)::int AS m FROM herb_images WHERE herb_id = $1`,
        [herbId],
      );
      let nextSort = (maxRows[0]?.m ?? -1) + 1;
      const isFirstOverall = realCount === 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const buffer = new Uint8Array(await file.arrayBuffer());
        // Kiểm tra nội dung thật (magic bytes), không tin MIME do client gửi (chống file giả).
        const realType = detectImageType(buffer);
        if (!realType) {
          throw new Error(`File "${file.name}" không phải ảnh JPG/PNG/WebP hợp lệ.`);
        }
        const { rows: ins } = await tx.query<{ id: string }>(
          `INSERT INTO herb_images (herb_id, image_url, r2_key, sort_order, is_primary)
           VALUES ($1, '', '', $2, $3) RETURNING id`,
          [herbId, nextSort, isFirstOverall && i === 0],
        );
        const imageId = ins[0].id;
        const key = herbImageKey(herb.canonical_key, imageId);
        const imageUrl = herbImageUrl(herb.canonical_key, imageId);
        await tx.query(
          `UPDATE herb_images SET image_url = $1, r2_key = $2 WHERE id = $3`,
          [imageUrl, key, imageId],
        );
        created.push({ id: imageId, key });
        // Upload R2 trong transaction: lỗi → throw → rollback DB (xóa row),
        // catch bên ngoài xóa file R2 đã upload (nếu có) để không còn file mồ côi.
        await uploadToR2(key, buffer, realType);
        if (isFirstOverall && i === 0) {
          await tx.query(
            `UPDATE herbs SET image_url = $1, updated_at = NOW() WHERE id = $2`,
            [imageUrl, herbId],
          );
        }
        nextSort++;
      }
    });
  } catch (e) {
    for (const it of created) {
      await deleteFromR2(it.key).catch(() => {});
      await db.query(`DELETE FROM herb_images WHERE id = $1`, [it.id]).catch(() => {});
    }
    const msg = e instanceof Error ? e.message : "Tải ảnh lên thất bại.";
    return { ok: false, error: msg };
  }
  await audit({
    userId: user.id,
    action: "UPLOAD_HERB_IMAGES",
    tableName: "herb_images",
    rowId: herbId,
    newValue: { count: files.length },
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/herbs/${herbId}`);
  revalidatePath(`/herbs/${herbId}/edit`);
  revalidatePath("/herbs");
  return { ok: true, data: { images: await freshImages(herbId) } };
}

/**
 * Xóa 1 ảnh khỏi gallery. DB là source of truth: xóa row trước, R2 dọn best-effort sau
 * (file R2 còn sót thì vô hình, không có URL nào trỏ tới; ngược lại row trỏ tới file đã xóa = ảnh hỏng).
 * - Ảnh bị xóa là đại diện → ảnh còn lại đầu tiên (sort_order nhỏ nhất) lên làm đại diện,
 *   herbs.image_url (mirror) cập nhật theo; hết ảnh → image_url = NULL.
 * - imageId "legacy" = ảnh cũ chưa có row: xóa file R2 key cũ + clear herbs.image_url.
 */
export async function deleteHerbImage(
  herbId: string,
  imageId: string,
): Promise<ActionState<{ images: HerbImage[] }>> {
  const user = await requireRole("admin", "practitioner");
  if (imageId === "legacy") {
    const herb = await getHerbQuery(herbId);
    if (!herb) return { ok: false, error: "Không tìm thấy vị thuốc." };
    if (herb.image_url) {
      await db.query(`UPDATE herbs SET image_url = NULL, updated_at = NOW() WHERE id = $1`, [herbId]);
      await deleteFromR2(legacyHerbImageKey(herb.canonical_key)).catch(() => {});
      await audit({
        userId: user.id,
        action: "DELETE_HERB_IMAGE",
        tableName: "herbs",
        rowId: herbId,
        newValue: {},
      });
      const { revalidatePath } = await import("next/cache");
      revalidatePath(`/herbs/${herbId}`);
      revalidatePath(`/herbs/${herbId}/edit`);
      revalidatePath("/herbs");
    }
    return { ok: true, data: { images: await freshImages(herbId) } };
  }
  const { rows } = await db.query<{ is_primary: boolean; r2_key: string }>(
    `SELECT is_primary, r2_key FROM herb_images WHERE id = $1 AND herb_id = $2`,
    [imageId, herbId],
  );
  const row = rows[0];
  if (!row) return { ok: true, data: { images: await freshImages(herbId) } }; // idempotent
  await withTransaction(async (tx) => {
    await tx.query(`DELETE FROM herb_images WHERE id = $1`, [imageId]);
    if (row.is_primary) {
      const { rows: next } = await tx.query<{ id: string; image_url: string }>(
        `SELECT id, image_url FROM herb_images WHERE herb_id = $1 ORDER BY sort_order ASC LIMIT 1`,
        [herbId],
      );
      if (next[0]) {
        await tx.query(`UPDATE herb_images SET is_primary = true WHERE id = $1`, [next[0].id]);
        await tx.query(`UPDATE herbs SET image_url = $1, updated_at = NOW() WHERE id = $2`, [
          next[0].image_url,
          herbId,
        ]);
      } else {
        await tx.query(`UPDATE herbs SET image_url = NULL, updated_at = NOW() WHERE id = $1`, [herbId]);
      }
    }
  });
  await deleteFromR2(row.r2_key).catch(() => {});
  await audit({
    userId: user.id,
    action: "DELETE_HERB_IMAGE",
    tableName: "herb_images",
    rowId: imageId,
    newValue: {},
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/herbs/${herbId}`);
  revalidatePath(`/herbs/${herbId}/edit`);
  revalidatePath("/herbs");
  return { ok: true, data: { images: await freshImages(herbId) } };
}

/** Đặt 1 ảnh làm đại diện (hiện ở danh sách + ảnh lớn ở chi tiết). herbs.image_url cập nhật theo. */
export async function setHerbPrimaryImage(
  herbId: string,
  imageId: string,
): Promise<ActionState<{ images: HerbImage[] }>> {
  const user = await requireRole("admin", "practitioner");
  if (imageId === "legacy") {
    return { ok: true, data: { images: await freshImages(herbId) } }; // ảnh legacy đã là đại diện
  }
  const { rows } = await db.query<{ image_url: string }>(
    `SELECT image_url FROM herb_images WHERE id = $1 AND herb_id = $2`,
    [imageId, herbId],
  );
  const row = rows[0];
  if (!row) return { ok: false, error: "Không tìm thấy ảnh." };
  await withTransaction(async (tx) => {
    await tx.query(`UPDATE herb_images SET is_primary = false WHERE herb_id = $1`, [herbId]);
    await tx.query(`UPDATE herb_images SET is_primary = true WHERE id = $1`, [imageId]);
    await tx.query(`UPDATE herbs SET image_url = $1, updated_at = NOW() WHERE id = $2`, [
      row.image_url,
      herbId,
    ]);
  });
  await audit({
    userId: user.id,
    action: "SET_HERB_PRIMARY_IMAGE",
    tableName: "herb_images",
    rowId: imageId,
    newValue: {},
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/herbs/${herbId}`);
  revalidatePath(`/herbs/${herbId}/edit`);
  revalidatePath("/herbs");
  return { ok: true, data: { images: await freshImages(herbId) } };
}
