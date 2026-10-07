import { z } from "zod";

const HANDS = ["left", "right"] as const;
const POSITIONS = ["thon", "quan", "xich"] as const;

export const pulseEntrySchema = z.object({
  hand: z.enum(HANDS),
  position: z.enum(POSITIONS),
  pulse_pattern_id: z.string().uuid().nullable(),
  custom_note: z.string().max(500).optional(),
});

export const visitSchema = z.object({
  patient_id: z.string().uuid("Bệnh nhân không hợp lệ"),
  inspection_notes: z.string().max(2000).optional(), // vọng
  auscultation_notes: z.string().max(2000).optional(), // văn
  inquiry_notes: z.string().max(2000).optional(), // vấn
  palpation_notes: z.string().max(2000).optional(), // thiết
  final_diagnosis: z.string().max(2000).optional(),
  bat_cuong: z.string().max(100).optional(), // VD: "Biểu,Hàn,Hư,Âm"
  doctor_notes: z.string().max(2000).optional(),
  pulses: z.array(pulseEntrySchema).max(6),
});

export type VisitInput = z.infer<typeof visitSchema>;
export { HANDS, POSITIONS };
