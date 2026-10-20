import { z } from "zod";

export const ROLES = ["admin", "practitioner", "dispenser", "cashier"] as const;

// Schema cho Server Action (bảo mật) — không reuse mù quáng với client
export const createUserSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  full_name: z.string().min(1, "Vui lòng nhập họ tên").max(100),
  phone: z.string().max(20).optional().or(z.literal("")),
  role: z.enum(ROLES, { message: "Vai trò không hợp lệ" }),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(72),
});

export const updateUserSchema = z.object({
  full_name: z.string().min(1, "Vui lòng nhập họ tên").max(100),
  phone: z.string().max(20).optional().or(z.literal("")),
  role: z.enum(ROLES, { message: "Vai trò không hợp lệ" }),
  password: z
    .string()
    .max(72)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || v.length >= 6, {
      message: "Mật khẩu tối thiểu 6 ký tự",
    }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
