import type { PrescriptionStatus } from "./constants";
import type { InteractionCategory } from "./interactionConstants";

export interface ActionState {
  error?: string;
}

export interface ItemInput {
  herb_name: string;
  weight_per_pack: number;
  herb_id?: string;
  note?: string;
}

export interface SafetyInteraction {
  interaction_id: string;
  herb_a_name: string;
  herb_b_name: string;
  severity: "cam_ky" | "can_trong";
  description: string | null;
  overridden: boolean;
}

export interface SafetyDosageWarning {
  herb_name: string;
  daily_dose: number;
  max_daily_dose: number;
}

export interface SafetyResult {
  interactions: SafetyInteraction[];
  dosageWarnings: SafetyDosageWarning[];
  blocking: SafetyInteraction[];
}

export interface FefoLotAllocation {
  lot_code: string;
  take: number;
  expiry_date: string | null;
}

export interface FefoPreviewItem {
  herb_name: string;
  needed: number;
  available: number;
  shortage: number;
  lots: FefoLotAllocation[];
}

export interface PrescriptionListRow {
  id: string;
  prescription_code: string;
  status: PrescriptionStatus;
  num_of_packs: number;
  created_at: string;
  patient_name: string;
  patient_code: string;
}

export interface PrescriptionDetailItem {
  herb_name: string;
  weight_per_pack: number;
  note: string | null;
}

export interface PrescriptionDetail {
  id: string;
  prescription_code: string;
  status: PrescriptionStatus;
  num_of_packs: number;
  usage_instruction: string | null;
  doctor_notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  template_id: string | null;
  template_version: number | null;
  template_name: string | null;
  patient_id: string;
  patient_code: string;
  patient_name: string;
  practitioner_name: string;
  items: PrescriptionDetailItem[];
}

export interface SnapshotItem {
  herbName: string;
  herbNameKey?: string;
  weightPerPack: number;
  totalWeight: number;
  note: string | null;
}

export interface SnapshotData {
  prescriptionCode: string;
  visitId: string;
  visitDate: string;
  patient: {
    id: string;
    code: string;
    name: string;
    dob: string | null;
    phone: string | null;
  };
  practitioner: { id: string | null; name: string };
  confirmedBy: { id: string; name: string };
  confirmedAt: string;
  items: SnapshotItem[];
  numOfPacks: number;
  weightUnit?: string;
  totalWeightAll: number;
  usageInstruction: string | null;
  doctorNotes: string | null;
}

export interface InteractionRow {
  id: string;
  herb_a_id: string;
  herb_b_id: string;
  herb_a_name: string;
  herb_a_code: string;
  herb_b_name: string;
  herb_b_code: string;
  severity: "cam_ky" | "can_trong";
  category: InteractionCategory;
  contraindicated_for: string[];
  symptoms: string | null;
  antidote: string | null;
  description: string | null;
  source: string | null;
  verified: boolean;
  verified_by_name: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface InteractionInput {
  herbAId: string;
  herbBId: string;
  severity: "cam_ky" | "can_trong";
  category: InteractionCategory;
  contraindicatedFor: string[];
  symptoms?: string;
  antidote?: string;
  description?: string;
  source?: string;
}

export interface DosageLimitData {
  max_daily_dose: number | null;
  source: string | null;
  verified: boolean;
}

export interface PrescriptionPageRow {
  id: string;
  prescription_code: string;
  status: PrescriptionStatus;
  num_of_packs: number;
  full_name: string;
  patient_code: string;
  phone: string | null;
  practitioner_name: string | null;
  created_at: string;
}

export interface PrescriptionFilters {
  status?: string;
  q?: string;
  date?: string;
  practitioner?: string;
  page?: number;
  pageSize?: number;
}

export interface PrescriptionsListResult {
  rows: PrescriptionPageRow[];
  total: number;
  totalPages: number;
  safePage: number;
  offset: number;
  pageSize: number;
}

export interface NewPrescriptionInitialData {
  visit: {
    id: string;
    visited_at: string;
    final_diagnosis: string | null;
    doctor_notes: string | null;
    patient_id: string;
    full_name: string;
    patient_code: string;
    sex: string | null;
    date_of_birth: string | null;
    allergies: string | null;
    medical_history: string | null;
  };
  pulses: Array<{ name_viet: string }>;
  templates: Array<{ id: string; code: string; version: number; name: string }>;
  defaultDecoction: string;
  initialItems?: Array<{ herb_name: string; dosage_text: string }>;
}
