import "server-only";
import { Client, type QueryResult, type QueryResultRow } from "pg";
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

// Trên Workers: TẠO CLIENT MỚI cho mỗi query, KHÔNG dùng Pool singleton.
// Lý do: Pool của pg không tương thích với mô hình stateless của Workers —
// khi isolate được tái sử dụng, Pool có thể kẹt (hết connection) gây treo vĩnh viễn.
// Hyperdrive tự quản lý connection pool ở phía nó, nên tạo Client mới rất rẻ.
async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: getConnectionString() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    // Đóng kết nối (không await để tránh treo nếu đã lỗi)
    await client.end().catch(() => {});
  }
}

export const db = {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    // pg yêu cầu any[] cho params — bất khả kháng, đã cách ly ở wrapper này
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any[],
  ): Promise<QueryResult<T>> => withClient((c) => c.query<T>(text, params)),
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
  return withClient(async (client) => {
    await client.query("BEGIN");
    try {
      const tx: TxClient = {
        query: (text, params) => client.query(text, params),
      };
      const result = await fn(tx);
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });
}

// Giữ getPool để tương thích ngược nếu code nào còn dùng (không khuyến khích)
export function getPool(): never {
  throw new Error("getPool đã bị loại bỏ — dùng db.query trực tiếp (tạo Client mới mỗi lần)");
}
