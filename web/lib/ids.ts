import { randomBytes } from "node:crypto";

const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Random letters+digits only (Nexconn user/channel IDs allow nothing else). */
export function randomAlnum(length: number): string {
  // 248 = largest multiple of 62 below 256, so the modulo is unbiased
  let out = "";
  while (out.length < length) {
    for (const b of randomBytes(length * 2)) {
      if (b < 248) out += ALNUM[b % 62];
      if (out.length === length) break;
    }
  }
  return out;
}

const hex = (uuid: string) => uuid.replace(/-/g, "");

// Nexconn IDs: letters and digits only, max 64 bytes (PLAN.md "Verified Nexconn facts").
export const nxId = {
  guest: () => `g${randomAlnum(20)}`,
  agent: (userId: string) => `a${hex(userId)}`,
  bot: (businessId: string) => `b${hex(businessId)}`,
  group: (conversationId: string) => `c${hex(conversationId)}`,
};

export const isGuestId = (v: unknown): v is string => typeof v === "string" && /^g[A-Za-z0-9]{20}$/.test(v);

export function roleFromNxId(id: string): "buyer" | "agent" | "bot" | null {
  if (id.startsWith("g")) return "buyer";
  if (id.startsWith("a")) return "agent";
  if (id.startsWith("b")) return "bot";
  return null;
}
