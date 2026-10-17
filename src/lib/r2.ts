import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 client (S3-compatible API).
 * Env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL.
 * R2_PUBLIC_URL là URL công khai của bucket (https://pub-xxx.r2.dev).
 */

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Chưa cấu hình R2: thiếu biến môi trường ${name}`);
  return v;
}

let client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

export function getR2Bucket(): string {
  return requireEnv("R2_BUCKET");
}

export function getR2PublicUrl(): string {
  return requireEnv("R2_PUBLIC_URL").replace(/\/$/, "");
}

/** Key ảnh vị thuốc: herbs/<canonical_key> (không đuôi — ghi đè khi upload lại, tránh file mồ côi). */
/**
 * Xoa object tren R2. Object da khong ton tai -> coi nhu thanh cong (idempotent).
 * Loi khac (timeout, quyen, ...) -> throw de caller giu nguyen image_url va cho thu lai.
 */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    await getR2Client().send(
      new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key }),
    );
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "NoSuchKey" || name === "NotFound") return;
    throw e;
  }
}

/**
 * Nhan dien loai anh tu magic bytes (khong tin MIME do client gui).
 * Tra ve MIME that hoac null neu khong phai JPG/PNG/WebP.
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

export function herbImageKey(canonicalKey: string): string {
  return `herbs/${canonicalKey}`;
}

export function herbImageUrl(canonicalKey: string): string {
  return `${getR2PublicUrl()}/${herbImageKey(canonicalKey)}`;
}

export async function uploadToR2(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      // Cache ngan (5 phut) de anh moi upload hien nhanh, tranh cache cu cua key ghi de.
      CacheControl: "public, max-age=300",
    }),
  );
}
