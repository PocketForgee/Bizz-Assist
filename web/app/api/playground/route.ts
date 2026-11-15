import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, HttpError, json, rateLimit, readJson, requireUuid } from "@/lib/http";
import { runAssistant, type BusinessInfo, type ChatTurn } from "@/lib/ai/answer";

/**
 * Dashboard Playground: runs the same assistant as live chats on an in-memory transcript.
 * Nothing is sent through Nexconn, stored, or counted against the monthly AI replies.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser(req, { role: "owner" });
  rateLimit(req, "playground", 30, 60_000);
  const body = await readJson(req);
  const widgetId = requireUuid(body.widgetId, "widget");
  const raw = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  const history: ChatTurn[] = raw
    .map((m) => (m ?? {}) as Record<string, unknown>)
    .filter((m) => (m.role === "buyer" || m.role === "bot") && typeof m.text === "string" && m.text.trim())
    .map((m) => ({ role: m.role as "buyer" | "bot", text: String(m.text).slice(0, 2000) }));
  if (history[history.length - 1]?.role !== "buyer") throw new HttpError(400, "Write a message first.");

  const [w] = await sql<({ persona: string; escalation_keywords: string[]; enabled_action_ids: string[] } & BusinessInfo)[]>`
    select w.persona, w.escalation_keywords, w.enabled_action_ids, b.name, b.category, b.website, b.support_hours, b.default_lang
    from widgets w join businesses b on b.id = w.business_id
    where w.id = ${widgetId} and w.business_id = ${user.business_id}
  `;
  if (!w) throw new HttpError(404, "Unknown widget.");

  const out = await runAssistant({
    businessId: user.business_id,
    business: w,
    persona: w.persona,
    keywords: w.escalation_keywords,
    buyerLang: w.default_lang,
    history,
    actionIds: w.enabled_action_ids,
    conversationId: null,
  });
  return json(out);
});
