import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";

async function requirePractitioner() {
  return requireRole("admin", "practitioner");
}

export interface SymptomOption {
  id: string;
  name: string;
  category: string;
}

export interface DiseaseOption {
  id: string;
  name: string;
}

export interface TemplateOption {
  id: string;
  name: string;
  code: string;
}

export interface DiagnosisResult {
  id: string;
  disease_name: string;
  pattern: string;
  treatment_principle: string | null;
  template_id: string | null;
  template_name: string | null;
  matched: number;
  total: number;
  matched_symptoms: string[];
}

export interface ClinicalCaseRow {
  id: string;
  disease_id: string;
  disease_name: string;
  pattern: string | null;
  treatment_principle: string | null;
  template_id: string | null;
  template_name: string | null;
  is_active: boolean;
}

export interface ClinicalCasesFilterParams {
  q?: string;
  disease?: string;
  page?: number;
  pageSize?: number;
}

export interface ClinicalCasesListResult {
  rows: ClinicalCaseRow[];
  total: number;
  totalPages: number;
  safePage: number;
  offset: number;
  pageSize: number;
  grouped: Map<
    string,
    { disease_id: string; disease_name: string; cases: ClinicalCaseRow[] }
  >;
}

export interface ClinicalCaseDetail {
  id: string;
  disease_id: string;
  disease_name: string;
  disease_description: string | null;
  pattern: string | null;
  treatment_principle: string | null;
  symptoms: string | null;
  template_id: string | null;
  template_name: string | null;
  template_code: string | null;
  template_version: number | null;
  usage_instruction: string | null;
  outcome: string | null;
  discussion: string | null;
  source: string | null;
  created_by_name: string | null;
  is_active: boolean;
  siblings: Array<{ id: string; pattern: string | null }>;
  items: Array<{
    herb_name: string;
    dosage_text: string;
    note: string | null;
  }>;
}

export interface ClinicalCaseEditData {
  caseData: {
    id: string;
    disease_id: string;
    disease_name: string;
    pattern: string | null;
    treatment_principle: string | null;
    symptoms: string | null;
    template_id: string | null;
    usage_instruction: string | null;
    outcome: string | null;
    discussion: string | null;
    source: string | null;
  };
  templates: TemplateOption[];
  symptoms: SymptomOption[];
  linkedSymptomIds: string[];
}

const PAGE_SIZES = [10, 25, 50];

/**
 * Lấy danh sách toàn bộ triệu chứng đang active
 */
export async function getAllSymptoms(): Promise<SymptomOption[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<SymptomOption>(
    `SELECT id, name, category FROM symptoms WHERE is_active = true ORDER BY sort_order, name`,
  );
  return rows;
}

/**
 * Chẩn đoán: chấm điểm bệnh án theo số tag triệu chứng khớp, xếp hạng giảm dần
 */
export async function diagnoseCases(
  symptomIds: string[],
): Promise<DiagnosisResult[]> {
  await requirePractitioner();
  if (symptomIds.length === 0) return [];
  const { rows } = await db.query<DiagnosisResult>(
    `SELECT c.id, d.name AS disease_name, c.pattern, c.treatment_principle,
       c.template_id, t.name AS template_name,
       COUNT(cs.symptom_id) FILTER (WHERE cs.symptom_id = ANY($1::uuid[])) AS matched,
       COUNT(cs.symptom_id) AS total,
       COALESCE(array_agg(s.name) FILTER (WHERE cs.symptom_id = ANY($1::uuid[])), '{}') AS matched_symptoms
     FROM clinical_cases c
     JOIN diseases d ON d.id = c.disease_id
     LEFT JOIN prescription_templates t ON t.id = c.template_id
     LEFT JOIN clinical_case_symptoms cs ON cs.case_id = c.id
     LEFT JOIN symptoms s ON s.id = cs.symptom_id
     WHERE c.is_active = true
     GROUP BY c.id, d.name, c.pattern, c.treatment_principle, c.template_id, t.name
     HAVING COUNT(cs.symptom_id) FILTER (WHERE cs.symptom_id = ANY($1::uuid[])) > 0
     ORDER BY matched DESC, (COUNT(cs.symptom_id) FILTER (WHERE cs.symptom_id = ANY($1::uuid[])))::float / NULLIF(COUNT(cs.symptom_id), 0) DESC
     LIMIT 20`,
    [symptomIds],
  );
  return rows.map((r) => ({
    ...r,
    matched: Number(r.matched),
    total: Number(r.total),
  }));
}

/**
 * Lấy danh sách bệnh danh đang hoạt động (dùng cho bộ lọc và select)
 */
export async function getDiseases(): Promise<DiseaseOption[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<DiseaseOption>(
    `SELECT id, name FROM diseases WHERE is_active = true ORDER BY name`,
  );
  return rows;
}

/**
 * Lấy danh sách bài thuốc mẫu active (bản mới nhất của mỗi code)
 */
export async function getActiveTemplates(): Promise<TemplateOption[]> {
  await requireRole("admin", "practitioner", "dispenser");
  const { rows } = await db.query<TemplateOption>(
    `SELECT DISTINCT ON (code) id, name, code FROM prescription_templates WHERE is_active = true ORDER BY code, version DESC`,
  );
  return rows;
}

/**
 * Lấy danh sách ca bệnh lâm sàng có phân trang và gom nhóm theo bệnh
 */
export async function getClinicalCasesList(
  params: ClinicalCasesFilterParams = {},
): Promise<ClinicalCasesListResult> {
  await requireRole("admin", "practitioner", "dispenser");

  const q = (params.q ?? "").trim();
  const diseaseFilter = params.disease ?? "";

  const rawSize = params.pageSize ? Number(params.pageSize) : 10;
  const pageSize = PAGE_SIZES.includes(rawSize) ? rawSize : 10;
  const page = Math.max(1, Number(params.page) || 1);

  const where: string[] = [];
  const queryParams: unknown[] = [];
  let i = 1;

  if (q) {
    where.push(
      `(d.name ILIKE $${i} OR c.pattern ILIKE $${i} OR c.treatment_principle ILIKE $${i} OR t.name ILIKE $${i})`,
    );
    queryParams.push(`%${q}%`);
    i++;
  }
  if (diseaseFilter) {
    where.push(`c.disease_id = $${i}`);
    queryParams.push(diseaseFilter);
    i++;
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRes = await db.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM clinical_cases c
     LEFT JOIN diseases d ON d.id = c.disease_id
     LEFT JOIN prescription_templates t ON t.id = c.template_id
     ${whereSql}`,
    queryParams,
  );
  const total = countRes.rows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const { rows } = await db.query<ClinicalCaseRow>(
    `SELECT c.id, c.disease_id, d.name AS disease_name, c.pattern, c.treatment_principle,
            c.template_id, t.name AS template_name, c.is_active
     FROM clinical_cases c
     LEFT JOIN diseases d ON d.id = c.disease_id
     LEFT JOIN prescription_templates t ON t.id = c.template_id
     ${whereSql}
     ORDER BY d.name, c.created_at DESC
     LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
    [...queryParams, pageSize, offset],
  );

  const grouped = new Map<
    string,
    { disease_id: string; disease_name: string; cases: ClinicalCaseRow[] }
  >();
  for (const r of rows) {
    const key = r.disease_id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        disease_id: r.disease_id,
        disease_name: r.disease_name,
        cases: [],
      });
    }
    grouped.get(key)!.cases.push(r);
  }

  return {
    rows,
    total,
    totalPages,
    safePage,
    offset,
    pageSize,
    grouped,
  };
}

/**
 * Lấy chi tiết bệnh án kinh nghiệm
 */
export async function getClinicalCaseDetail(
  id: string,
): Promise<ClinicalCaseDetail | null> {
  await requireUser();

  const { rows } = await db.query<
    Omit<ClinicalCaseDetail, "siblings" | "items">
  >(
    `SELECT c.*, d.name AS disease_name, d.description AS disease_description,
            t.name AS template_name, t.code AS template_code,
            t.version AS template_version, u.full_name AS created_by_name
     FROM clinical_cases c
     LEFT JOIN diseases d ON d.id = c.disease_id
     LEFT JOIN prescription_templates t ON t.id = c.template_id
     LEFT JOIN users u ON u.id = c.created_by
     WHERE c.id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  const c = rows[0];

  const [siblingsRes, itemsRes] = await Promise.all([
    db.query<{ id: string; pattern: string | null }>(
      `SELECT id, pattern FROM clinical_cases
       WHERE disease_id = $1 AND id != $2 AND is_active = true
       ORDER BY created_at`,
      [c.disease_id, id],
    ),
    c.template_id
      ? db.query<{ herb_name: string; dosage_text: string; note: string | null }>(
          `SELECT herb_name, dosage_text, note
           FROM prescription_template_items
           WHERE template_id = $1 ORDER BY sort_order`,
          [c.template_id],
        )
      : Promise.resolve({ rows: [] }),
  ]);

  return {
    ...c,
    siblings: siblingsRes.rows,
    items: itemsRes.rows,
  };
}

/**
 * Lấy dữ liệu phục vụ chỉnh sửa ca bệnh lâm sàng
 */
export async function getClinicalCaseForEdit(
  id: string,
): Promise<ClinicalCaseEditData | null> {
  await requirePractitioner();

  const { rows } = await db.query<ClinicalCaseEditData["caseData"]>(
    `SELECT c.id, c.disease_id, d.name AS disease_name, c.pattern,
            c.treatment_principle, c.symptoms, c.template_id,
            c.usage_instruction, c.outcome, c.discussion, c.source
     FROM clinical_cases c
     LEFT JOIN diseases d ON d.id = c.disease_id
     WHERE c.id = $1`,
    [id],
  );
  if (rows.length === 0) return null;

  const [templatesRes, symptomsRes, linkedRes] = await Promise.all([
    db.query<TemplateOption>(
      `SELECT DISTINCT ON (code) id, name, code FROM prescription_templates WHERE is_active = true ORDER BY code, version DESC`,
    ),
    db.query<SymptomOption>(
      `SELECT id, name, category FROM symptoms WHERE is_active = true ORDER BY sort_order, name`,
    ),
    db.query<{ symptom_id: string }>(
      `SELECT symptom_id FROM clinical_case_symptoms WHERE case_id = $1`,
      [id],
    ),
  ]);

  return {
    caseData: rows[0],
    templates: templatesRes.rows,
    symptoms: symptomsRes.rows,
    linkedSymptomIds: linkedRes.rows.map((r) => r.symptom_id),
  };
}

/**
 * Lấy các tập dữ liệu ban đầu cho form thêm ca bệnh mới
 */
export async function getNewCaseFormData(): Promise<{
  diseases: DiseaseOption[];
  templates: TemplateOption[];
  symptoms: SymptomOption[];
}> {
  await requirePractitioner();

  const [diseasesRes, templatesRes, symptomsRes] = await Promise.all([
    db.query<DiseaseOption>(
      `SELECT id, name FROM diseases WHERE is_active = true ORDER BY name`,
    ),
    db.query<TemplateOption>(
      `SELECT DISTINCT ON (code) id, name, code FROM prescription_templates WHERE is_active = true ORDER BY code, version DESC`,
    ),
    db.query<SymptomOption>(
      `SELECT id, name, category FROM symptoms WHERE is_active = true ORDER BY sort_order, name`,
    ),
  ]);

  return {
    diseases: diseasesRes.rows,
    templates: templatesRes.rows,
    symptoms: symptomsRes.rows,
  };
}
