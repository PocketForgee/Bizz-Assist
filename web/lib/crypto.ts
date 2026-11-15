// AES-256-GCM for secrets at rest (API Action headers). Key: APP_ENCRYPTION_KEY, 64 hex chars.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { HttpError } from "./http";

function key(): Buffer {
  const hex = process.env.APP_ENCRYPTION_KEY ?? "";
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new HttpError(500, "Server encryption key is not set (APP_ENCRYPTION_KEY).");
  return Buffer.from(hex, "hex");
}

/** -> "v1.<iv>.<tag>.<ciphertext>" (base64url parts) */
export function encrypt(plain: string, k: Buffer = key()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function decrypt(token: string, k: Buffer = key()): string {
  const [v, iv, tag, ct] = token.split(".");
  if (v !== "v1" || !iv || !tag || ct === undefined) throw new Error("bad ciphertext");
  const d = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}
