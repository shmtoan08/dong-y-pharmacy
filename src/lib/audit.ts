import "server-only";
import { db } from "./db";

interface AuditEntry {
  userId: string | null;
  action: string;
  tableName: string;
  rowId: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  requestId?: string;
  ipAddress?: string;
}

/** Ghi audit log append-only. Không throw nếu fail (không chặn nghiệp vụ chính). */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, table_name, row_id, old_value, new_value, reason, request_id, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entry.userId,
        entry.action,
        entry.tableName,
        entry.rowId,
        entry.oldValue ? JSON.stringify(entry.oldValue) : null,
        entry.newValue ? JSON.stringify(entry.newValue) : null,
        entry.reason ?? null,
        entry.requestId ?? null,
        entry.ipAddress ?? null,
      ],
    );
  } catch (err) {
    console.error("[audit] ghi log thất bại:", err);
  }
}
