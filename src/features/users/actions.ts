"use server";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { requireRole, revokeAllSessions } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { createUserSchema, updateUserSchema } from "./schemas";

import type { ActionState } from "@/types/action-state";
export type { ActionState };

async function requireAdmin() {
  return requireRole("admin");
}

export async function createUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { email, full_name, phone, role, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await db.query(`SELECT id FROM users WHERE email = $1`, [
    normalizedEmail,
  ]);
  if (existing.rows.length > 0) {
    return { error: "Email đã tồn tại" };
  }

  const passwordHash = await hashPassword(password);
  const { rows } = await db.query(
    `INSERT INTO users (email, full_name, phone, role, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [normalizedEmail, full_name.trim(), phone?.trim() || null, role, passwordHash],
  );

  await audit({
    userId: admin.id,
    action: "CREATE_USER",
    tableName: "users",
    rowId: rows[0].id,
    newValue: { email: normalizedEmail, full_name, role },
  });

  return { success: true };
}

export async function updateUser(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = updateUserSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { rows: existing } = await db.query(
    `SELECT id, email, full_name, role FROM users WHERE id = $1`,
    [id],
  );
  if (existing.length === 0) {
    return { error: "Không tìm thấy nhân viên" };
  }
  const old = existing[0];

  // Không cho tự hạ quyền chính mình (tránh khóa admin cuối cùng)
  if (old.id === admin.id && parsed.data.role !== "admin") {
    return { error: "Không thể tự thay đổi vai trò của chính mình" };
  }

  const { full_name, phone, role, password } = parsed.data;

  if (password) {
    const passwordHash = await hashPassword(password);
    await db.query(
      `UPDATE users SET full_name = $1, phone = $2, role = $3, password_hash = $4
       WHERE id = $5`,
      [full_name.trim(), phone?.trim() || null, role, passwordHash, id],
    );
    // Đổi mật khẩu → đá hết session cũ (theo review security).
    // Kể cả session hiện tại — admin sẽ phải đăng nhập lại, an toàn hơn.
    await revokeAllSessions(id);
    await audit({
      userId: admin.id,
      action: "PASSWORD_CHANGED",
      tableName: "users",
      rowId: id,
    });
  } else {
    await db.query(
      `UPDATE users SET full_name = $1, phone = $2, role = $3 WHERE id = $4`,
      [full_name.trim(), phone?.trim() || null, role, id],
    );
  }

  await audit({
    userId: admin.id,
    action: "UPDATE_USER",
    tableName: "users",
    rowId: id,
    oldValue: { full_name: old.full_name, role: old.role },
    newValue: { full_name, role },
  });

  return { success: true };
}

export async function toggleUserActive(id: string): Promise<void> {
  const admin = await requireAdmin();

  if (id === admin.id) {
    throw new Error("Không thể tự khóa tài khoản của chính mình");
  }

  const { rows } = await db.query(`SELECT is_active FROM users WHERE id = $1`, [
    id,
  ]);
  if (rows.length === 0) throw new Error("Không tìm thấy nhân viên");

  const newActive = !rows[0].is_active;
  await db.query(`UPDATE users SET is_active = $1 WHERE id = $2`, [
    newActive,
    id,
  ]);

  // Khóa tài khoản → xóa hết session (user bị đá ra ngay)
  if (!newActive) {
    await revokeAllSessions(id);
  }

  await audit({
    userId: admin.id,
    action: newActive ? "UNLOCK_USER" : "LOCK_USER",
    tableName: "users",
    rowId: id,
  });
}

/** Admin đặt lại mật khẩu cho nhân viên (mật khẩu mới do admin nhập) */
export async function resetUserPassword(
  id: string,
  newPassword: string,
): Promise<ActionState> {
  const admin = await requireAdmin();

  if (newPassword.length < 6) {
    return { error: "Mật khẩu mới phải có ít nhất 6 ký tự" };
  }

  const { rows } = await db.query(`SELECT id FROM users WHERE id = $1`, [id]);
  if (rows.length === 0) return { error: "Không tìm thấy nhân viên" };

  const passwordHash = await hashPassword(newPassword);
  await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
    passwordHash,
    id,
  ]);

  // Đổi mật khẩu → đá hết session của nhân viên đó (trừ khi là chính admin)
  if (id !== admin.id) {
    await revokeAllSessions(id);
  }

  await audit({
    userId: admin.id,
    action: "RESET_USER_PASSWORD",
    tableName: "users",
    rowId: id,
  });
  return { success: true };
}
