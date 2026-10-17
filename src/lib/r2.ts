/**
 * Cloudflare R2 client (S3-compatible API) — CHI WEB API THUAN (fetch + WebCrypto).
 * KHONG dung @aws-sdk/client-s3: SDK keo theo node:fs (credential/config providers)
 * -> tren Cloudflare Workers bi loi "[unenv] fs.readFile is not implemented yet!"
 * (tren VM Node thi chay duoc, nen loi chi xuat hien o production).
 *
 * Env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL.
 * R2_PUBLIC_URL la URL cong khai cua bucket (https://pub-xxx.r2.dev).
 */

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Chưa cấu hình R2: thiếu biến môi trường ${name}`);
  return v;
}

function getR2Bucket(): string {
  return requireEnv("R2_BUCKET");
}

function getR2PublicUrl(): string {
  return requireEnv("R2_PUBLIC_URL").replace(/\/$/, "");
}

/** Key anh vi thuoc: herbs/<canonical_key>/<image_id> — MOI ANH 1 KEY RIENG.
 * (Truoc day dung chung key herbs/<canonical_key> nen upload lai van giu nguyen URL,
 * trinh duyet/CDN tra cache cu -> anh moi khong hien. Key rieng thi URL moi -> het loi cache.)
 * Anh cu (truoc khi co bang herb_images) dung key herbs/<canonical_key> — luu trong cot r2_key. */
export function herbImageKey(canonicalKey: string, imageId: string): string {
  return `herbs/${canonicalKey}/${imageId}`;
}

export function herbImageUrl(canonicalKey: string, imageId: string): string {
  return `${getR2PublicUrl()}/${herbImageKey(canonicalKey, imageId)}`;
}

/** Key anh cu (dang don, truoc khi co bang herb_images) — dung khi migrate/xoa anh legacy. */
export function legacyHerbImageKey(canonicalKey: string): string {
  return `herbs/${canonicalKey}`;
}

// ---------- SigV4 (S3) — WebCrypto, chay duoc ca Workers lan Node ----------

const textEncoder = new TextEncoder();

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto không khả dụng trong runtime này.");
  return subtle;
}

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const buf = typeof data === "string" ? textEncoder.encode(data) : data;
  const hash = await getSubtle().digest("SHA-256", buf as BufferSource);
  return toHex(new Uint8Array(hash));
}

async function hmac(key: Uint8Array | string, data: string): Promise<Uint8Array> {
  const k = typeof key === "string" ? textEncoder.encode(key) : key;
  const cryptoKey = await getSubtle().importKey(
    "raw",
    k as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await getSubtle().sign("HMAC", cryptoKey, textEncoder.encode(data));
  return new Uint8Array(sig);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function amzDate(d: Date): { date: string; datetime: string } {
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`;
  const datetime = `${date}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
  return { date, datetime };
}

/**
 * Gui request da ky SigV4 toi R2. Tra ve Response (caller kiem tra .ok).
 * Luu y: header `host` chi co trong canonical request de ky — fetch tu dat Host tu URL,
 * khong set thu cong (fetch cam header `host`).
 */
async function signedR2Request(
  method: "PUT" | "DELETE",
  key: string,
  body: Uint8Array | undefined,
  contentType: string | undefined,
  extraHeaders: Record<string, string>,
): Promise<Response> {
  const bucket = getR2Bucket();
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKey = requireEnv("R2_ACCESS_KEY_ID");
  const secretKey = requireEnv("R2_SECRET_ACCESS_KEY");
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const url = `https://${host}/${bucket}/${encodedKey}`;
  const { date, datetime } = amzDate(new Date());
  const payloadHash = await sha256Hex(body ?? new Uint8Array(0));

  const signHeaders: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": datetime,
    ...extraHeaders,
  };
  if (contentType) signHeaders["content-type"] = contentType;
  const signedNames = Object.keys(signHeaders).sort();
  const canonicalHeaders = signedNames
    .map((n) => `${n}:${signHeaders[n].trim()}\n`)
    .join("");
  const canonicalRequest = [
    method,
    `/${bucket}/${encodedKey}`,
    "",
    canonicalHeaders,
    signedNames.join(";"),
    payloadHash,
  ].join("\n");

  const scope = `${date}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    datetime,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");
  const kDate = await hmac(`AWS4${secretKey}`, date);
  const kRegion = await hmac(kDate, "auto");
  const kService = await hmac(kRegion, "s3");
  const kSigning = await hmac(kService, "aws4_request");
  const signature = toHex(await hmac(kSigning, stringToSign));

  const fetchHeaders: Record<string, string> = {
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": datetime,
    ...extraHeaders,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedNames.join(";")}, Signature=${signature}`,
  };
  if (contentType) fetchHeaders["content-type"] = contentType;

  return fetch(url, {
    method,
    headers: fetchHeaders,
    body: body as BodyInit | undefined,
  });
}

export async function uploadToR2(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  const res = await signedR2Request("PUT", key, body, contentType, {
    // Cache ngan (5 phut) de anh moi upload hien nhanh, tranh cache cu cua key ghi de.
    "cache-control": "public, max-age=300",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload R2 thất bại (${res.status}) ${text}`.trim());
  }
}

/**
 * Xóa object trên R2. Object đã không tồn tại → coi như thành công (idempotent).
 * Lỗi khác (timeout, quyền, ...) → throw để caller giữ nguyên image_url và cho thử lại.
 */
export async function deleteFromR2(key: string): Promise<void> {
  const res = await signedR2Request("DELETE", key, undefined, undefined, {});
  // S3 DELETE idempotent: key khong ton tai van tra 204. 404 (neu co) cung coi nhu thanh cong.
  if (res.ok || res.status === 404) return;
  const text = await res.text().catch(() => "");
  throw new Error(`Xóa R2 thất bại (${res.status}) ${text}`.trim());
}

/**
 * Nhận diện loại ảnh từ magic bytes (không tin MIME do client gửi).
 * Trả về MIME thật hoặc null nếu không phải JPG/PNG/WebP.
 */
export function detectImageType(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return "image/png";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  )
    return "image/webp";
  return null;
}
