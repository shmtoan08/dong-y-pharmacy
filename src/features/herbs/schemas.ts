import { z } from "zod";

export const herbSchema = z.object({
  name_common: z.string().min(1, "Tên vị thuốc là bắt buộc").max(100),
  name_han_viet: z.string().max(100).optional(),
  name_science: z.string().max(200).optional(),
  used_part: z.string().max(100).optional(),
  property_tinh: z.string().max(50).optional(),
  property_vi: z.string().max(50).optional(),
  quy_kinh: z.string().max(200).optional(), // nhập "tỳ, phế" → array
  cong_nang: z.string().max(2000).optional(),
  kieng_ky: z.string().max(2000).optional(),
  vi_tri_hoc_tu: z.string().max(100).optional(),
  base_unit: z.string().max(20),
  price_per_unit: z.coerce.number().min(0, "Đơn giá không âm").optional(),
  stock_quantity: z.coerce.number().min(0, "Tồn kho không âm").optional(),
  min_stock_quantity: z.coerce.number().min(0, "Ngưỡng không âm").optional(),
  is_valuable: z.boolean(),
});

export type HerbInput = z.infer<typeof herbSchema>;

export const aliasSchema = z.object({
  alias_name: z.string().min(1, "Tên khác là bắt buộc").max(100),
});

export type AliasInput = z.infer<typeof aliasSchema>;
