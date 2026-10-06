"use server";

import { redirect } from "next/navigation";
import { destroySession, getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function logout(): Promise<void> {
  const user = await getSessionUser();
  await destroySession();
  if (user) {
    await audit({
      userId: user.id,
      action: "LOGOUT",
      tableName: "users",
      rowId: user.id,
    });
  }
  redirect("/login");
}
