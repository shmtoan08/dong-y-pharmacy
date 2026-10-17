import { z } from "zod";

export const patientSchema = z.object({
  full_name: z.string().min(1, "Họ tên bắt buộc").max(100),
  date_of_birth: z
    .string()
    .optional()
    .refine((v) => {
      // Ngày phải tồn tại trên lịch: new Date("2026-02-31") tự lăn thành
      // 03/03 nên phải verify round-trip y/m/d.
      if (!v) return true;
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
      if (!m) return false;
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      const dt = new Date(y, mo - 1, d);
      return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
    }, "Ngày sinh không hợp lệ")
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
