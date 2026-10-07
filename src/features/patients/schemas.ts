import { z } from "zod";

export const patientSchema = z.object({
  full_name: z.string().min(1, "Họ tên bắt buộc").max(100),
  date_of_birth: z
    .string()
    .optional()
    .refine(
      (v) => !v || new Date(v) <= new Date(),
      "Ngày sinh không được ở tương lai",
    ),
  sex: z.enum(["male", "female", "other"]).optional(),
  phone: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(v.replace(/[\s.]/g, "")),
      "Số điện thoại không đúng format Việt Nam",
    ),
  address: z.string().max(255).optional(),
  medical_history: z.string().max(2000).optional(),
  allergies: z.string().max(1000).optional(),
});

export type PatientInput = z.infer<typeof patientSchema>;
