import { z } from "zod";

export const FORMULA_CATEGORIES = ["co_phuong", "gia_truyen", "tu_che"] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  co_phuong: "Cổ phương",
  gia_truyen: "Gia truyền",
  tu_che: "Tự chế",
};

const herbItemSchema = z.object({
  herb_name: z.string().min(1, "Thiếu tên vị").max(100),
  dosage_text: z.string().min(1, "Thiếu liều").max(20),
  note: z.string().max(200).optional().or(z.literal("")),
});

// Schema cho Server Action — items gửi dưới dạng JSON string từ form
export const createFormulaSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên bài thuốc").max(200),
  category: z.enum(FORMULA_CATEGORIES, { message: "Phân loại không hợp lệ" }),
  source_book: z.string().max(200).optional().or(z.literal("")),
  syndrome: z.string().max(500).optional().or(z.literal("")),
  indications: z.string().max(2000).optional().or(z.literal("")),
  usage_note: z.string().max(2000).optional().or(z.literal("")),
  items: z
    .array(herbItemSchema)
    .min(1, "Bài thuốc cần ít nhất 1 vị")
    .max(100, "Tối đa 100 vị"),
});

export const updateFormulaSchema = createFormulaSchema;

export type CreateFormulaInput = z.infer<typeof createFormulaSchema>;
export type HerbItemInput = z.infer<typeof herbItemSchema>;
