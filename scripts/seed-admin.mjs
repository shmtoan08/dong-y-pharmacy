import bcrypt from "bcryptjs";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const email = "admin@phongthuoc.local";
const password = "admin123";
const hash = await bcrypt.hash(password, 10);

const { rows } = await pool.query(
  "INSERT INTO users (email, full_name, role, password_hash) VALUES ($1, $2, 'admin', $3) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash RETURNING id, email",
  [email, "Quản trị viên", hash],
);
console.log("Seed admin:", rows[0]);
await pool.end();
