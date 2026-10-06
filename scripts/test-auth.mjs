// Test MVP-0 auth logic trực tiếp trên VM
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // 1. Verify admin password hash
  const { rows } = await pool.query("SELECT password_hash FROM users WHERE email = $1", ["admin@phongthuoc.local"]);
  const ok = await bcrypt.compare("admin123", rows[0].password_hash);
  console.log("1. Verify password (đúng):", ok ? "PASS" : "FAIL");

  const wrong = await bcrypt.compare("sai123", rows[0].password_hash);
  console.log("2. Verify password (sai):", !wrong ? "PASS" : "FAIL");

  // 3. Tạo session + query như getSessionUser
  const token = "test-token-123";
  await pool.query("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, (SELECT id FROM users WHERE email='admin@phongthuoc.local'), NOW() + INTERVAL '8 hours') ON CONFLICT (token) DO NOTHING", [token]);
  const { rows: s } = await pool.query(
    "SELECT u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_active = true",
    [token]
  );
  console.log("3. Session lookup:", s.length === 1 && s[0].role === "admin" ? "PASS" : "FAIL");

  // 4. Xóa session hết hạn (dọn dẹp)
  await pool.query("DELETE FROM sessions WHERE token = $1", [token]);

  // 5. Audit log ghi được
  await pool.query(
    "INSERT INTO audit_logs (user_id, action, table_name, row_id) VALUES ((SELECT id FROM users WHERE email='admin@phongthuoc.local'), 'TEST', 'users', gen_random_uuid())"
  );
  const { rows: a } = await pool.query("SELECT COUNT(*) as c FROM audit_logs WHERE action = 'TEST'");
  console.log("4. Audit log:", Number(a[0].c) > 0 ? "PASS" : "FAIL");
  await pool.query("DELETE FROM audit_logs WHERE action = 'TEST'");

  await pool.end();
  console.log("Xong.");
}

main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
