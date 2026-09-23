import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

function key(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY || "";
  if (!raw) throw new Error("APP_ENCRYPTION_KEY is not set");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) return decoded;
  return scryptSync(raw, "job-hunt-tracker", 32);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
