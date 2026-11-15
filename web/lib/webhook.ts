// Pure webhook parsing + dedupe (no DB, no Next) so it can be unit-tested.
// Payload: /platform-chat-api/webhook/message/send.md — envelope {type, id, time, data[]},
// data item {userId, channelId, messageType, content(JSON string), channelType, time, messageId, os}.

export type IncomingText = {
  messageId: string;
  fromUserId: string;
  groupId: string;
  text: string;
  time: number;
};

const GROUP_CHANNEL_TYPE = 3;

/** Extracts text messages sent by clients into our conversation groups (`c…`). */
export function parseMessageSend(body: unknown): IncomingText[] {
  if (!body || typeof body !== "object") return [];
  const env = body as { type?: unknown; data?: unknown };
  if (env.type !== "message:send" || !Array.isArray(env.data)) return [];

  const out: IncomingText[] = [];
  for (const item of env.data) {
    if (!item || typeof item !== "object") continue;
    const d = item as Record<string, unknown>;
    if (d.channelType !== GROUP_CHANNEL_TYPE) continue;
    if (d.os === "Server") continue; // our own server-API sends; never answer ourselves
    if (d.messageType !== "RC:TxtMsg") continue;
    if (typeof d.channelId !== "string" || !d.channelId.startsWith("c")) continue;
    if (typeof d.userId !== "string" || typeof d.messageId !== "string") continue;

    let text = "";
    try {
      const c = JSON.parse(String(d.content ?? "")) as { content?: unknown };
      text = typeof c.content === "string" ? c.content : "";
    } catch {
      continue;
    }
    text = text.trim();
    if (!text) continue;

    out.push({
      messageId: d.messageId,
      fromUserId: d.userId,
      groupId: d.channelId,
      text: text.slice(0, 4000),
      time: typeof d.time === "number" ? d.time : Date.now(),
    });
  }
  return out;
}

/**
 * Remembers recently seen IDs so Nexconn's retries (5 s timeout, 2 retries) are dropped before
 * touching the DB. The DB unique index on messages.nx_message_id is the real guarantee.
 */
export class Deduper {
  private seen = new Map<string, number>();
  constructor(
    private ttlMs = 10 * 60 * 1000,
    private max = 5000,
  ) {}

  /** true the first time an id is seen within the TTL, false for repeats. */
  firstSeen(id: string, now = Date.now()): boolean {
    const at = this.seen.get(id);
    if (at !== undefined && now - at < this.ttlMs) return false;
    this.seen.set(id, now);
    if (this.seen.size > this.max) {
      for (const [k, t] of this.seen) {
        if (now - t >= this.ttlMs || this.seen.size > this.max) this.seen.delete(k);
        else break;
      }
    }
    return true;
  }
}
