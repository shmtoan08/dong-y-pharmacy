import { z } from "zod";

export const prescriptionItemSchema = z.object({
  herb_id: z.string().uuid().nullable().optional(),
  herb_name: z.string().min(1, "Tên vị thuốc bắt buộc").max(100),
  weight_per_pack: z
    .number({ message: "Liều phải là số" })
    .positive("Liều phải lớn hơn 0")
    .max(1000, "Liều quá lớn"),
  note: z.string().max(500).optional(),
});

export const prescriptionDraftSchema = z.object({
  visit_id: z.string().uuid("Lượt khám không hợp lệ"),
  template_id: z.string().uuid().nullable().optional(), // null = kê tay
  template_version: z.number().int().positive().nullable().optional(),
  num_of_packs: z
    .number({ message: "Số thang phải là số" })
    .int("Số thang phải là số nguyên")
    .positive("Số thang phải lớn hơn 0")
    .max(100),
  usage_instruction: z.string().max(2000).optional(),
  doctor_notes: z.string().max(2000).optional(),
  items: z.array(prescriptionItemSchema).min(1, "Đơn thuốc cần ít nhất 1 vị"),
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;
export type PrescriptionDraftInput = z.infer<typeof prescriptionDraftSchema>;
