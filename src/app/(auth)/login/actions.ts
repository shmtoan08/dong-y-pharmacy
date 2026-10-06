"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginAttempts,
} from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export interface LoginState {
  error?: string;
}

// Thông báo chung cho mọi trường hợp sai — chống user enumeration
const GENERIC_ERROR = "Email hoặc mật khẩu không đúng";

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit: 5 lần sai / 15 phút → khóa 15 phút
  const rl = await checkLoginRateLimit(normalizedEmail);
  if (!rl.allowed) {
    return {
      error: "Thử quá nhiều lần. Vui lòng đợi 15 phút rồi thử lại.",
    };
  }

  const { rows } = await db.query(
    `SELECT id, email, full_name, role, password_hash, is_active
     FROM users WHERE email = $1`,
    [normalizedEmail],
  );
  const user = rows[0];

  const valid =
    user?.is_active &&
    user?.password_hash &&
    (await verifyPassword(password, user.password_hash));

  if (!valid) {
    await recordFailedLogin(normalizedEmail);
    // Chỉ audit khi email tồn tại (có user id thật) — chống spam audit log
    if (user?.id) {
      await audit({
        userId: user.id,
        action: "LOGIN_FAILED",
        tableName: "users",
        rowId: user.id,
      });
    }
    return { error: GENERIC_ERROR };
  }

  await clearLoginAttempts(normalizedEmail);
  await createSession(user.id);
  await audit({
    userId: user.id,
    action: "LOGIN",
    tableName: "users",
    rowId: user.id,
  });

  redirect("/");
}
