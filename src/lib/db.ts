import "server-only";
import { Pool, type QueryResult, type QueryResultRow } from "pg";

// Lazy singleton — tránh tạo pool lúc build time
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL chưa được cấu hình");
    }
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
