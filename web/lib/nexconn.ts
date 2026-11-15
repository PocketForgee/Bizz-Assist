// Nexconn Platform Chat API helper. Server-only: holds the App Secret.
// Facts verified against docs.nexconn.ai (2026-11-15):
//   signing   /platform-chat-api/prepare-to-use-api/auth.md   Signature = sha1(appSecret + nonce + timestamp), headers App-Key/Nonce/Timestamp/Signature
//   base URLs /platform-chat-api/prepare-to-use-api/base-url.md (primary + backup per data center)
//   token     /platform-chat-api/user/register.md              POST /v4/auth/access-token/issue {userId, name, avatarUrl?} -> result.accessToken
//   groups    /platform-chat-api/group-channel/...             POST /v4/group-channel/create {channelId, name, owner, userIds?}, /v4/group-channel/join {channelId, userIds}
//   send      /platform-chat-api/message/send-group.md         POST /v4/group-channel/message/send {fromUserId, toChannelIds[], toUserIds?, messageType, content(JSON string)}
//   system    /platform-chat-api/message/system/send-private.md POST /v4/system-channel/message/send {fromUserId, toUserIds[], messageType, content}
//   webhook   /platform-chat-api/webhook/overview.md            headers AppKey/Nonce/Timestamp/Signature, same sha1 formula
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type Area = "SG" | "NA" | "SA";

const BASE_URLS: Record<Area, [primary: string, backup: string]> = {
  SG: ["https://api.sg-light-api.com", "https://api-b.sg-light-api.com"],
  NA: ["https://api.us-light-api.com", "https://api-b.us-light-api.com"],
  SA: ["https://api.sau-light-api.com", "https://api-b.sau-light-api.com"],
};

// Client SDK AreaCode enum values (@nexconn/engine): SG = 2, NA = 3, SA = 5
const AREA_CODES: Record<Area, number> = { SG: 2, NA: 3, SA: 5 };

export type NexconnConfig = { appKey: string; appSecret: string; area: Area };

export function nexconnConfig(): NexconnConfig {
  const area = (process.env.NEXCONN_AREA ?? "SG").toUpperCase();
  return {
    appKey: process.env.NEXCONN_APP_KEY ?? "",
    appSecret: process.env.NEXCONN_APP_SECRET ?? "",
    area: (area in BASE_URLS ? area : "SG") as Area,
  };
}

export const isNexconnConfigured = () => {
  const c = nexconnConfig();
  return Boolean(c.appKey && c.appSecret);
};

/** What the browser / Android app may know: App Key and area only, never the secret. */
export function clientConfig() {
  const c = nexconnConfig();
  return { appKey: c.appKey, areaCode: AREA_CODES[c.area] };
}

// ---- signing ----

export function signature(appSecret: string, nonce: string, timestamp: string): string {
  return createHash("sha1").update(appSecret + nonce + timestamp).digest("hex");
}

export function signedHeaders(cfg: Pick<NexconnConfig, "appKey" | "appSecret">, now = Date.now()): Record<string, string> {
  const nonce = randomBytes(8).toString("hex").slice(0, 16); // docs: up to 18 chars
  const timestamp = String(now);
  return {
    "App-Key": cfg.appKey,
    Nonce: nonce,
    Timestamp: timestamp,
    Signature: signature(cfg.appSecret, nonce, timestamp),
    "Content-Type": "application/json",
    "X-Request-ID": randomBytes(16).toString("hex"),
  };
}

const WEBHOOK_MAX_SKEW_MS = 10 * 60 * 1000;

/** Verifies a webhook request's AppKey/Nonce/Timestamp/Signature headers. */
export function verifyWebhook(headers: Headers, cfg: Pick<NexconnConfig, "appKey" | "appSecret"> = nexconnConfig(), now = Date.now()): boolean {
  const appKey = headers.get("appkey");
  const nonce = headers.get("nonce");
  const timestamp = headers.get("timestamp");
  const sig = headers.get("signature");
  if (!cfg.appSecret || !appKey || !nonce || !timestamp || !sig) return false;
  if (appKey !== cfg.appKey) return false;
  const ts = Number(timestamp);
  // replay guard: Nexconn retries within ~15 s (5 s timeout, 2 retries)
  if (!Number.isFinite(ts) || Math.abs(now - ts) > WEBHOOK_MAX_SKEW_MS) return false;
  const expected = Buffer.from(signature(cfg.appSecret, nonce, timestamp), "utf8");
  const given = Buffer.from(sig.toLowerCase(), "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// ---- transport ----

export class NexconnError extends Error {
  constructor(
    public code: number,
    public path: string,
    message: string,
  ) {
    super(message);
  }
}

let useBackup = false; // flips to the backup domain after a timeout / 5xx (docs: domain failover)

async function attempt(base: string, path: string, body: unknown, cfg: NexconnConfig) {
  return fetch(base + path, {
    method: "POST",
    headers: signedHeaders(cfg),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
}

/** Signed POST. Returns the parsed body; throws NexconnError unless `code === 0`. */
export async function nxPost<T = Record<string, unknown>>(path: string, body: unknown): Promise<T> {
  const cfg = nexconnConfig();
  if (!cfg.appKey || !cfg.appSecret) throw new NexconnError(-1, path, "Nexconn is not configured (NEXCONN_APP_KEY / NEXCONN_APP_SECRET).");
  const [primary, backup] = BASE_URLS[cfg.area];
  const order = useBackup ? [backup, primary] : [primary, backup];

  let res: Response | null = null;
  let lastErr: unknown;
  for (const base of order) {
    try {
      res = await attempt(base, path, body, cfg);
      if (res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
        res = null;
        useBackup = base === primary;
        continue;
      }
      break;
    } catch (err) {
      lastErr = err;
      useBackup = base === primary;
    }
  }
  if (!res) throw new NexconnError(-1, path, `Nexconn unreachable: ${String(lastErr)}`);

  const data = (await res.json().catch(() => ({}))) as { code?: number; msg?: string; errorMessage?: string };
  if (res.status === 401) throw new NexconnError(401, path, "Nexconn rejected the signature (check App Key / App Secret).");
  if (data.code !== 0) {
    throw new NexconnError(data.code ?? res.status, path, `Nexconn ${path} failed: ${data.msg ?? data.errorMessage ?? JSON.stringify(data)}`);
  }
  return data as T;
}

// ---- API calls ----

export async function issueToken(userId: string, name: string, avatarUrl?: string): Promise<string> {
  const body: Record<string, string> = { userId, name: name.slice(0, 64) };
  if (avatarUrl) body.avatarUrl = avatarUrl;
  const r = await nxPost<{ result: { accessToken: string } }>("/v4/auth/access-token/issue", body);
  return r.result.accessToken;
}

/** The owner is set as channel owner and joins automatically; userIds are added without consent (invitePerm default 0). */
export async function createGroup(channelId: string, name: string, owner: string, userIds: string[] = []) {
  await nxPost("/v4/group-channel/create", {
    channelId,
    name: name.slice(0, 64),
    owner,
    ...(userIds.length ? { userIds } : {}),
  });
}

export async function joinGroup(channelId: string, userIds: string[]) {
  await nxPost("/v4/group-channel/join", { channelId, userIds });
}

const textContent = (text: string) => JSON.stringify({ content: text });

/** Sends RC:TxtMsg into a group. The sender need not be a member. Server-API messages do not reach our webhook. */
export async function sendGroupText(fromUserId: string, channelId: string, text: string, toUserIds?: string[]): Promise<string | null> {
  const r = await nxPost<{ result?: { messageIds?: { channelId: string; messageId: string }[] } }>("/v4/group-channel/message/send", {
    fromUserId,
    toChannelIds: [channelId],
    ...(toUserIds?.length ? { toUserIds } : {}),
    messageType: "RC:TxtMsg",
    content: textContent(text),
  });
  return r.result?.messageIds?.[0]?.messageId ?? null;
}

/** System channel alert (read-only in ChatUI); used for agent push alerts. Max 100 recipients per call. */
export async function sendSystemText(fromUserId: string, toUserIds: string[], text: string, pushContent?: string) {
  for (let i = 0; i < toUserIds.length; i += 100) {
    await nxPost("/v4/system-channel/message/send", {
      fromUserId,
      toUserIds: toUserIds.slice(i, i + 100),
      messageType: "RC:TxtMsg",
      content: textContent(text),
      ...(pushContent ? { pushContent } : {}),
    });
  }
}
