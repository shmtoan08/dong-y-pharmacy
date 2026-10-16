import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import type {
  PrescriptionDetail,
  SnapshotData,
  PrescriptionListRow,
  PrescriptionFilters,
  PrescriptionsListResult,
  PrescriptionPageRow,
  NewPrescriptionInitialData,
  FefoPreviewItem,
  SafetyResult,
  SafetyInteraction,
  SafetyDosageWarning,
  InteractionRow,
  DosageLimitData,
} from "./types";

const PAGE_SIZES = [10, 25, 50];
const VALID_STATUS = ["draft", "confirmed", "completed", "cancelled"];

/**
 * Lấy chi tiết đơn thuốc kèm danh sách vị thuốc
 */
export async function getPrescription(id: string): Promise<PrescriptionDetail | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query(
    `SELECT p.id, p.prescription_code, p.status, p.num_of_packs,
            p.usage_instruction, p.doctor_notes, p.created_at, p.confirmed_at,
            p.template_id, p.template_version, t.name AS template_name,
            pt.id AS patient_id, pt.patient_code, pt.full_name AS patient_name,
            u.full_name AS practitioner_name
     FROM prescriptions p
     JOIN visits v ON v.id = p.visit_id
     JOIN patients pt ON pt.id = v.patient_id
     JOIN users u ON u.id = p.practitioner_id
     LEFT JOIN prescription_templates t ON t.id = p.template_id
     WHERE p.id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  const { rows: items } = await db.query(
    `SELECT herb_name, weight_per_pack, note FROM prescription_items
     WHERE prescription_id = $1 ORDER BY id`,
    [id],
  );
  return { ...rows[0], items } as PrescriptionDetail;
}

/**
 * Lấy snapshot bất biến của đơn thuốc đã chốt
 */
export async function getPrescriptionSnapshot(
  prescriptionId: string,
): Promise<SnapshotData | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<{ snapshot_data: SnapshotData }>(
    `SELECT snapshot_data FROM prescription_snapshots
     WHERE prescription_id = $1 ORDER BY version DESC LIMIT 1`,
    [prescriptionId],
  );
  return rows[0]?.snapshot_data ?? null;
}

/**
 * Lấy danh sách đơn thuốc theo lượt khám
 */
export async function getPrescriptionsByVisit(
  visitId: string,
): Promise<PrescriptionListRow[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<PrescriptionListRow>(
    `SELECT p.id, p.prescription_code, p.status, p.num_of_packs, p.created_at,
            pt.full_name AS patient_name, pt.patient_code
     FROM prescriptions p
     JOIN visits v ON v.id = p.visit_id
     JOIN patients pt ON pt.id = v.patient_id
     WHERE p.visit_id = $1
     ORDER BY p.created_at DESC`,
    [visitId],
  );
  return rows;
}

/**
 * Lấy danh sách đơn thuốc phân trang, lọc theo trạng thái, ngày, bác sĩ
 */
export async function getPrescriptionsList(
  params: PrescriptionFilters = {},
): Promise<PrescriptionsListResult> {
  await requireRole("admin", "practitioner", "dispenser");

  const status = VALID_STATUS.includes(params.status ?? "") ? params.status! : "";
  const q = (params.q ?? "").trim();
  const dateFilter = ["today", "week"].includes(params.date ?? "") ? params.date! : "all";
  const practitionerFilter = params.practitioner ?? "all";

  const rawSize = params.pageSize ? Number(params.pageSize) : 10;
  const pageSize = PAGE_SIZES.includes(rawSize) ? rawSize : 10;
  const page = Math.max(1, Number(params.page) || 1);

  const where: string[] = [];
  const queryParams: unknown[] = [];
  let i = 1;

  if (status) {
    where.push(`pr.status = $${i}`);
    queryParams.push(status);
    i++;
  }
  if (q) {
    where.push(`(pr.prescription_code ILIKE $${i} OR p.full_name ILIKE $${i} OR p.phone ILIKE $${i})`);
    queryParams.push(`%${q}%`);
    i++;
  }
  if (dateFilter === "today") {
    where.push(`pr.created_at >= date_trunc('day', now())`);
  } else if (dateFilter === "week") {
    where.push(`pr.created_at >= date_trunc('week', now())`);
  }
  if (practitionerFilter !== "all") {
    where.push(`pr.practitioner_id = $${i}`);
    queryParams.push(practitionerFilter);
    i++;
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countFiltered = await db.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM prescriptions pr
     JOIN visits v ON v.id = pr.visit_id
     JOIN patients p ON p.id = v.patient_id
     ${whereSql}`,
    queryParams,
  );
  const total = countFiltered.rows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const { rows } = await db.query<PrescriptionPageRow>(
    `SELECT pr.id, pr.prescription_code, pr.status, pr.num_of_packs,
            p.full_name, p.patient_code, p.phone, pr.created_at,
            u.full_name AS practitioner_name
     FROM prescriptions pr
     JOIN visits v ON v.id = pr.visit_id
     JOIN patients p ON p.id = v.patient_id
     JOIN users u ON u.id = pr.practitioner_id
     ${whereSql}
     ORDER BY pr.created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...queryParams, pageSize, offset],
  );

  return {
    rows,
    total,
    totalPages,
    safePage,
    offset,
    pageSize,
  };
}

/**
 * Lấy metadata bộ lọc trang đơn thuốc (counts theo tab và danh sách bác sĩ)
 */
export async function getPrescriptionFilterMetadata(): Promise<{
  counts: Record<string, number>;
  totalAll: number;
  practitioners: Array<{ id: string; name: string }>;
}> {
  await requireRole("admin", "practitioner", "dispenser");
  const [countRes, pracRes] = await Promise.all([
    db.query<{ status: string; cnt: string }>(
      `SELECT status, COUNT(*)::text AS cnt FROM prescriptions GROUP BY status`,
    ),
    db.query<{ id: string; name: string }>(
      `SELECT u.id, u.full_name AS name
       FROM users u
       WHERE u.role = 'practitioner' AND u.is_active
       ORDER BY name`,
    ),
  ]);

  const counts: Record<string, number> = {};
  for (const r of countRes.rows) counts[r.status] = Number(r.cnt);
  const totalAll = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    counts,
    totalAll,
    practitioners: pracRes.rows,
  };
}

/**
 * Lấy dữ liệu khởi tạo cho trang Kê đơn mới (`/prescriptions/new`)
 */
export async function getNewPrescriptionData(
  visitId: string,
  templateId?: string,
): Promise<NewPrescriptionInitialData | null> {
  await requireRole("admin", "practitioner");

  const [vrRes, pulsesRes, templates, decoctRes, initialItems] = await Promise.all([
    db.query<NewPrescriptionInitialData["visit"]>(
      `SELECT v.id, v.visited_at, v.final_diagnosis, v.doctor_notes,
              pt.id AS patient_id, pt.full_name, pt.patient_code, pt.sex,
              pt.date_of_birth, pt.allergies, pt.medical_history
       FROM visits v JOIN patients pt ON pt.id = v.patient_id
       WHERE v.id = $1`,
      [visitId],
    ),
    db.query<{ name_viet: string }>(
      `SELECT pp.name_viet
       FROM visit_pulses vp JOIN pulse_patterns pp ON pp.id = vp.pulse_pattern_id
       WHERE vp.visit_id = $1
       ORDER BY vp.hand, vp.position
       LIMIT 6`,
      [visitId],
    ),
    getActiveTemplatesForPrescription(),
    db.query<{ value: string }>(
      `SELECT value FROM system_settings WHERE key = 'decoction_instructions'`,
    ),
    templateId ? getTemplateItemsForPrescription(templateId) : Promise.resolve(undefined),
  ]);

  if (vrRes.rows.length === 0) return null;

  return {
    visit: vrRes.rows[0],
    pulses: pulsesRes.rows,
    templates,
    defaultDecoction: decoctRes.rows[0]?.value ?? "",
    initialItems,
  };
}

/**
 * Lấy bài thuốc mẫu (version mới nhất, active) để kê đơn
 */
export async function getActiveTemplatesForPrescription(): Promise<
  { id: string; code: string; version: number; name: string }[]
> {
  await requireRole("admin", "practitioner");
  const { rows } = await db.query<{ id: string; code: string; version: number; name: string }>(
    `SELECT DISTINCT ON (code) id, code, version, name
     FROM prescription_templates
     WHERE is_active = true
     ORDER BY code, version DESC`,
  );
  return rows;
}

/**
 * Lấy danh sách vị thuốc trong bài thuốc mẫu để điền vào đơn
 */
export async function getTemplateItemsForPrescription(
  templateId: string,
): Promise<{ herb_name: string; dosage_text: string }[]> {
  await requireRole("admin", "practitioner");
  const { rows } = await db.query<{ herb_name: string; dosage_text: string }>(
    `SELECT herb_name, dosage_text FROM prescription_template_items
     WHERE template_id = $1 ORDER BY sort_order`,
    [templateId],
  );
  return rows;
}

/**
 * Preview FEFO cho dialog xác nhận bốc thuốc (read-only, không lock)
 */
export async function previewDispense(id: string): Promise<FefoPreviewItem[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows: rx } = await db.query<{ num_of_packs: number }>(
    `SELECT num_of_packs FROM prescriptions WHERE id = $1`,
    [id],
  );
  if (rx.length === 0) return [];
  const numPacks = Number(rx[0].num_of_packs) || 1;

  const { rows: items } = await db.query<{
    herb_id: string; herb_name: string; weight_per_pack: number;
  }>(
    `SELECT herb_id, herb_name, weight_per_pack FROM prescription_items
     WHERE prescription_id = $1 AND herb_id IS NOT NULL`,
    [id],
  );

  const out: FefoPreviewItem[] = [];
  for (const it of items) {
    const needed = Number(it.weight_per_pack) * numPacks;
    const { rows: lots } = await db.query<{
      lot_code: string; quantity_current: number; expiry_date: string | null;
    }>(
      `SELECT lot_code, quantity_current, expiry_date FROM stock_lots
       WHERE herb_id = $1 AND quantity_current > 0
         AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
       ORDER BY expiry_date NULLS LAST, created_at ASC, id ASC`,
      [it.herb_id],
    );
    let rest = needed;
    const take: FefoPreviewItem["lots"] = [];
    for (const l of lots) {
      if (rest <= 0) break;
      const t = Math.min(Number(l.quantity_current), rest);
      take.push({ lot_code: l.lot_code, take: t, expiry_date: l.expiry_date });
      rest -= t;
    }
    const available = needed - rest;
    out.push({
      herb_name: it.herb_name,
      needed,
      available,
      shortage: Math.max(0, rest),
      lots: take,
    });
  }
  return out;
}

/**
 * Đánh giá an toàn đơn thuốc (tương kỵ & vượt liều)
 */
export async function evaluatePrescriptionSafety(
  prescriptionId: string,
  tx: { query: typeof db.query },
): Promise<SafetyResult> {
  const { rows: items } = await tx.query<{ herb_id: string; herb_name: string; weight_per_pack: number }>(
    `SELECT DISTINCT ON (herb_id) herb_id, herb_name, weight_per_pack
     FROM prescription_items WHERE prescription_id = $1 AND herb_id IS NOT NULL`,
    [prescriptionId],
  );
  const { rows: pr } = await tx.query<{ num_of_packs: number }>(
    `SELECT num_of_packs FROM prescriptions WHERE id = $1`,
    [prescriptionId],
  );
  const numPacks = pr.length > 0 ? Number(pr[0].num_of_packs) || 1 : 1;

  const interactions: SafetyInteraction[] = [];
  const herbIds = items.map((i) => i.herb_id);

  for (let i = 0; i < herbIds.length; i++) {
    for (let j = i + 1; j < herbIds.length; j++) {
      const a = herbIds[i] < herbIds[j] ? herbIds[i] : herbIds[j];
      const b = herbIds[i] < herbIds[j] ? herbIds[j] : herbIds[i];
      const { rows: ix } = await tx.query<{
        id: string; severity: string; description: string | null;
        herb_a_name: string; herb_b_name: string;
      }>(
        `SELECT ix.id, ix.severity, ix.description,
                ha.name_common AS herb_a_name, hb.name_common AS herb_b_name
         FROM herb_interactions ix
         JOIN herbs ha ON ha.id = ix.herb_a_id
         JOIN herbs hb ON hb.id = ix.herb_b_id
         WHERE ix.herb_a_id = $1 AND ix.herb_b_id = $2 AND ix.verified = TRUE`,
        [a, b],
      );
      for (const r of ix) {
        const { rows: ov } = await tx.query(
          `SELECT 1 FROM prescription_interaction_overrides
           WHERE prescription_id = $1 AND interaction_id = $2`,
          [prescriptionId, r.id],
        );
        interactions.push({
          interaction_id: r.id,
          herb_a_name: r.herb_a_name,
          herb_b_name: r.herb_b_name,
          severity: r.severity as "cam_ky" | "can_trong",
          description: r.description,
          overridden: ov.length > 0,
        });
      }
    }
  }

  const dosageWarnings: SafetyDosageWarning[] = [];
  for (const it of items) {
    const { rows: dl } = await tx.query<{ max_daily_dose: number }>(
      `SELECT max_daily_dose FROM herb_dosage_limits
       WHERE herb_id = $1 AND verified = TRUE AND max_daily_dose IS NOT NULL`,
      [it.herb_id],
    );
    if (dl.length > 0) {
      const dailyDose = Number(it.weight_per_pack) * numPacks;
      const maxDose = Number(dl[0].max_daily_dose);
      if (dailyDose > maxDose) {
        dosageWarnings.push({
          herb_name: it.herb_name,
          daily_dose: dailyDose,
          max_daily_dose: maxDose,
        });
      }
    }
  }

  const blocking = interactions.filter((x) => x.severity === "cam_ky" && !x.overridden);
  return { interactions, dosageWarnings, blocking };
}

/**
 * UI gọi để hiển thị cảnh báo tương kỵ real-time
 */
export async function checkPrescriptionSafety(
  prescriptionId: string,
): Promise<SafetyResult> {
  await requireRole("admin", "practitioner", "dispenser");
  return evaluatePrescriptionSafety(prescriptionId, { query: db.query.bind(db) });
}

/**
 * Danh sách tương kỵ thuốc
 */
export async function listInteractions(filter?: {
  q?: string;
  severity?: string;
  category?: string;
  verified?: string;
}): Promise<InteractionRow[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const conds: string[] = [];
  const params: unknown[] = [];
  if (filter?.q) {
    params.push(`%${filter.q}%`);
    conds.push(`(ha.name_common ILIKE $${params.length} OR hb.name_common ILIKE $${params.length})`);
  }
  if (filter?.severity) {
    params.push(filter.severity);
    conds.push(`ix.severity = $${params.length}`);
  }
  if (filter?.category) {
    params.push(filter.category);
    conds.push(`ix.category = $${params.length}`);
  }
  if (filter?.verified === "yes") conds.push(`ix.verified = TRUE`);
  if (filter?.verified === "no") conds.push(`ix.verified = FALSE`);
  const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";
  const { rows } = await db.query(
    `SELECT ix.id, ix.herb_a_id, ix.herb_b_id, ix.severity, ix.category,
            ix.contraindicated_for, ix.symptoms, ix.antidote,
            ix.description, ix.source,
            ix.verified, ix.verified_at, ix.created_at,
            ha.name_common AS herb_a_name, ha.code AS herb_a_code,
            hb.name_common AS herb_b_name, hb.code AS herb_b_code,
            u.full_name AS verified_by_name
     FROM herb_interactions ix
     JOIN herbs ha ON ha.id = ix.herb_a_id
     JOIN herbs hb ON hb.id = ix.herb_b_id
     LEFT JOIN users u ON u.id = ix.verified_by
     ${where}
     ORDER BY ix.verified ASC, ix.severity DESC, ix.created_at DESC`,
    params,
  );
  return rows as InteractionRow[];
}

/**
 * Lấy chi tiết 1 cặp tương kỵ theo ID
 */
export async function getInteraction(id: string): Promise<InteractionRow | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const rows = await listInteractions();
  return rows.find((r) => r.id === id) ?? null;
}

/**
 * Lấy thông tin giới hạn liều của 1 vị thuốc
 */
export async function getDosageLimit(herbId: string): Promise<DosageLimitData | null> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<DosageLimitData>(
    `SELECT max_daily_dose, source, verified FROM herb_dosage_limits WHERE herb_id = $1`,
    [herbId],
  );
  return rows.length > 0 ? rows[0] : null;
}
