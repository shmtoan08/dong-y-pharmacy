import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
    }),
  );
}
