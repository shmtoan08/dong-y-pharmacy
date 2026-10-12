import "server-only";
import { Pool, type QueryResult, type QueryResultRow, type PoolClient } from "pg";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Lay connection string: uu tien Hyperdrive (Cloudflare) → fallback DATABASE_URL (local/VM)
function getConnectionString(): string {
  // 1. Hyperdrive binding (chay tren Cloudflare Workers)
  try {
    const env = getCloudflareContext().env as Record<string, any>;
    const cs = env?.HYPERDRIVE?.connectionString as string | undefined;
    if (cs) return cs;
  } catch {
    // khong trong Cloudflare runtime → dung env thuong
  }
  // 2. Local dev / VM
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("DATABASE_URL chưa được cấu hình");
  return cs;
}

// Lazy singleton — tránh tạo pool lúc build time
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = getConnectionString();
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}

export const db = {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    // pg yêu cầu any[] cho params — bất khả kháng, đã cách ly ở wrapper này
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any[],
  ): Promise<QueryResult<T>> => getPool().query<T>(text, params),
};

interface TxClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any[],
  ): Promise<QueryResult<T>>;
}

/**
 * Chạy callback trong 1 transaction Postgres.
 * Tự động ROLLBACK nếu callback throw, COMMIT nếu thành công.
 */
export async function withTransaction<T>(
  fn: (tx: TxClient) => Promise<T>,
): Promise<T> {
  const client: PoolClient = await getPool().connect();
  try {
    await client.query("BEGIN");
    const tx: TxClient = {
      query: (text, params) => client.query(text, params),
    };
    const result = await fn(tx);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
