import { randomUUID } from "crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { safeStoredName } from "./http";

const MAX_BYTES = 12 * 1024 * 1024;

type StoredKind = "cv" | "profile";

function bucketConfig() {
  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.AWS_REGION?.trim();
  if (!bucket || !region || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) return null;
  return { bucket, region };
}

function client() {
  const config = bucketConfig();
  if (!config) return null;
  return { bucket: config.bucket, s3: new S3Client({ region: config.region }) };
}

function objectKeyFor(userId: string, kind: StoredKind, filename: string) {
  return `users/${userId}/${kind}/${randomUUID()}-${safeStoredName(filename)}`;
}

function ownedKey(userId: string, objectKey: string) {
  const prefix = `users/${userId}/`;
  if (!objectKey.startsWith(prefix) || objectKey.includes("..")) return null;
  return objectKey;
}

export function s3Configured() {
  return bucketConfig() !== null;
}

export async function saveUpload(userId: string, kind: StoredKind, file: File | null) {
  if (!file || file.size === 0 || file.size > MAX_BYTES) return null;
  const stored = client();
  if (!stored) return null;
  const filename = file.name || "file";
  const objectKey = objectKeyFor(userId, kind, filename);
  const mime = file.type || "application/octet-stream";
  try {
    await stored.s3.send(
      new PutObjectCommand({
        Bucket: stored.bucket,
        Key: objectKey,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: mime,
        ServerSideEncryption: "AES256",
      }),
    );
  } catch {
    return null;
  }
  return { objectKey, filename, mime, byteSize: file.size };
}

export async function readStored(userId: string, objectKey: string) {
  const key = ownedKey(userId, objectKey);
  const stored = client();
  if (!key || !stored) return null;
  try {
    const response = await stored.s3.send(new GetObjectCommand({ Bucket: stored.bucket, Key: key }));
    if (!response.Body) return null;
    return new Uint8Array(await response.Body.transformToByteArray());
  } catch {
    return null;
  }
}

export async function removeStored(userId: string, objectKey: string) {
  const key = ownedKey(userId, objectKey);
  const stored = client();
  if (!key || !stored) return;
  await stored.s3.send(new DeleteObjectCommand({ Bucket: stored.bucket, Key: key })).catch(() => undefined);
}
