"use server";

import { redirect } from "next/navigation";
import { db, withTransaction } from "@/lib/db";
import { requireRole, getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { normalizeHerbKey } from "@/lib/herb-key";
import { createFormulaSchema } from "./schemas";
import type { HerbItemInput } from "./schemas";

export interface ActionState {
  error?: string;
}

async function requirePractitioner() {
  // Admin và thầy thuốc được quản lý bài thuốc; nhân viên bốc thuốc chỉ xem
  return requireRole("admin", "practitioner");
}

async function nextFormulaCode(): Promise<string> {
  const { rows } = await db.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS INT)), 0) + 1 AS n
     FROM prescription_templates WHERE code LIKE 'BT-%'`,
  );
  const n = Number(rows[0].n);
  return `BT-${String(n).padStart(4, "0")}`;
}

interface TxLike {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any[],
  ): Promise<{ rows: T[] }>;
}

async function insertItemsTx(
  tx: TxLike,
  templateId: string,
  items: HerbItemInput[],
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    await tx.query(
      `INSERT INTO prescription_template_items
         (template_id, herb_name, herb_name_key, dosage_text, sort_order, note)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        templateId,
        item.herb_name.trim(),
        normalizeHerbKey(item.herb_name),
        item.dosage_text.trim(),
        i,
        item.note?.trim() || null,
      ],
    );
  }
}

function parseItems(formData: FormData): HerbItemInput[] | null {
  const raw = formData.get("items");
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function createFormula(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePractitioner();

  const items = parseItems(formData);
  const parsed = createFormulaSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    source_book: formData.get("source_book"),
    syndrome: formData.get("syndrome"),
    indications: formData.get("indications"),
    usage_note: formData.get("usage_note"),
    items,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const d = parsed.data;
  const code = await nextFormulaCode();

  // Transaction: template + items phải atomic (theo review ChatGPT)
  let templateId: string;
  try {
    templateId = await withTransaction(async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO prescription_templates
           (code, name, version, category, source_book, syndrome, indications, usage_note, created_by)
         VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          code,
          d.name.trim(),
          d.category,
          d.source_book?.trim() || null,
          d.syndrome?.trim() || null,
          d.indications?.trim() || null,
          d.usage_note?.trim() || null,
          user.id,
        ],
      );
      const newId = rows[0].id;
      await insertItemsTx(tx, newId, d.items);
      return newId;
    });
  } catch (e) {
    console.error("[createFormula] transaction failed:", e);
    return { error: "Không tạo được bài thuốc, vui lòng thử lại" };
  }

  await audit({
    userId: user.id,
    action: "CREATE_FORMULA",
    tableName: "prescription_templates",
    rowId: templateId,
    newValue: { code, name: d.name, version: 1 },
  });

  redirect("/formulas");
}

export async function updateFormula(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePractitioner();

  const items = parseItems(formData);
  const parsed = createFormulaSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    source_book: formData.get("source_book"),
    syndrome: formData.get("syndrome"),
    indications: formData.get("indications"),
    usage_note: formData.get("usage_note"),
    items,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  // Lấy version hiện tại → tạo version mới (không sửa version cũ, immutable)
  const { rows: cur } = await db.query(
    `SELECT code, version FROM prescription_templates WHERE id = $1`,
    [id],
  );
  if (cur.length === 0) return { error: "Không tìm thấy bài thuốc" };
  const newVersion = Number(cur[0].version) + 1;
  const code = cur[0].code as string;

  const d = parsed.data;

  // Transaction: version mới + items phải atomic.
  // UNIQUE(code, version) ở DB sẽ chặn race condition (2 người cùng tạo v3).
  let newId: string;
  try {
    newId = await withTransaction(async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO prescription_templates
           (code, name, version, category, source_book, syndrome, indications, usage_note, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          code,
          d.name.trim(),
          newVersion,
          d.category,
          d.source_book?.trim() || null,
          d.syndrome?.trim() || null,
          d.indications?.trim() || null,
          d.usage_note?.trim() || null,
          user.id,
        ],
      );
      const nid = rows[0].id;
      await insertItemsTx(tx, nid, d.items);
      return nid;
    });
  } catch (e) {
    // Unique violation → có người vừa tạo version này trước
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "23505") {
      return {
        error:
          "Bài thuốc vừa được cập nhật bởi người khác. Vui lòng tải lại và thử lại.",
      };
    }
    console.error("[updateFormula] transaction failed:", e);
    return { error: "Không lưu được version mới, vui lòng thử lại" };
  }

  await audit({
    userId: user.id,
    action: "UPDATE_FORMULA",
    tableName: "prescription_templates",
    rowId: newId,
    oldValue: { code, version: cur[0].version },
    newValue: { code, version: newVersion },
  });

  redirect(`/formulas/${newId}`);
}

export async function toggleFormulaActive(id: string): Promise<void> {
  const user = await requirePractitioner();

  const { rows } = await db.query(
    `SELECT is_active, code, version FROM prescription_templates WHERE id = $1`,
    [id],
  );
  if (rows.length === 0) throw new Error("Không tìm thấy bài thuốc");

  const newActive = !rows[0].is_active;
  await db.query(`UPDATE prescription_templates SET is_active = $1 WHERE id = $2`, [
    newActive,
    id,
  ]);

  await audit({
    userId: user.id,
    action: newActive ? "ACTIVATE_FORMULA" : "DEACTIVATE_FORMULA",
    tableName: "prescription_templates",
    rowId: id,
    newValue: { code: rows[0].code, version: rows[0].version },
  });
}

export async function duplicateFormula(id: string): Promise<string> {
  const user = await requirePractitioner();

  const { rows: tpl } = await db.query(
    `SELECT name, category, source_book, syndrome, indications, usage_note
     FROM prescription_templates WHERE id = $1`,
    [id],
  );
  if (tpl.length === 0) throw new Error("Không tìm thấy bài thuốc");

  const { rows: items } = await db.query(
    `SELECT herb_name, dosage_text, note FROM prescription_template_items
     WHERE template_id = $1 ORDER BY sort_order`,
    [id],
  );

  const t = tpl[0];
  const code = await nextFormulaCode();

  // Clone = family mới (code mới, v1) — không nhầm với version (theo review ChatGPT)
  const newId = await withTransaction(async (tx) => {
    const { rows: nt } = await tx.query<{ id: string }>(
      `INSERT INTO prescription_templates
         (code, name, version, category, source_book, syndrome, indications, usage_note, created_by)
       VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        code,
        `${t.name} (bản sao)`,
        t.category,
        t.source_book,
        t.syndrome,
        t.indications,
        t.usage_note,
        user.id,
      ],
    );
    const nid = nt[0].id;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await tx.query(
        `INSERT INTO prescription_template_items
           (template_id, herb_name, herb_name_key, dosage_text, sort_order, note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [nid, it.herb_name, normalizeHerbKey(it.herb_name as string), it.dosage_text, i, it.note],
      );
    }
    return nid;
  });

  await audit({
    userId: user.id,
    action: "DUPLICATE_FORMULA",
    tableName: "prescription_templates",
    rowId: newId,
    newValue: { code, from: id },
  });

  return newId;
}

export async function getSessionForFormulaPage() {
  return getSessionUser();
}
