import { sql } from "../db";
import { nxId } from "../ids";
import { baseLang, langName } from "../langs";
import { sendGroupText } from "../nexconn";
import { askLLM, MODEL_LITE } from "./llm";

const SCHEMA = {
  type: "object",
  properties: {
    source: { type: "string", description: "ISO 639-1 code of the message's language, e.g. es" },
    translation: { type: "string", description: "The message in the target language; empty when it is already in it" },
  },
  required: ["source", "translation"],
};

/**
 * Lite-model translation that also detects the source language.
 * `translation` is null when the text is already in `to`; the whole result is null when the model fails.
 */
export async function translate(text: string, to: string): Promise<{ source: string; translation: string | null } | null> {
  const target = langName(baseLang(to));
  const res = await askLLM({
    model: MODEL_LITE(),
    system:
      `You translate customer-support chat messages into ${target}. Keep order numbers, emails, links and product names unchanged. ` +
      `Return the message's language as an ISO 639-1 code, and the translation with no notes or quotes. ` +
      `If the message is already in ${target}, return an empty translation.`,
    contents: [{ role: "user", parts: [{ text }] }],
    json: { schema: SCHEMA },
    temperature: 0,
  });
  if (!res.ok) return null;
  try {
    const out = JSON.parse(res.text) as { source?: unknown; translation?: unknown };
    const source = typeof out.source === "string" && /^[a-z]{2,3}$/i.test(out.source.trim()) ? out.source.trim().toLowerCase() : "";
    const translation = typeof out.translation === "string" && out.translation.trim() ? out.translation.trim().slice(0, 4000) : null;
    if (!source) return null;
    return { source, translation: baseLang(source) === baseLang(to) ? null : translation };
  } catch {
    return null;
  }
}

/** Status notes (handover, agent joined, closed) are written in English; this puts one in the language the buyer last wrote in. */
export async function inBuyerLanguage(conversationId: string, note: string): Promise<string> {
  const [m] = await sql<{ text: string }[]>`
    select text from messages where conversation_id = ${conversationId} and sender_role = 'buyer' order by created_at desc limit 1
  `;
  if (!m) return note;
  const res = await askLLM({
    model: MODEL_LITE(),
    system:
      "You localize short customer-support status notes. Rewrite the NOTE in the language of the CUSTOMER MESSAGE, keeping names unchanged. " +
      "If the note is already in that language, return it unchanged. Return only the note, with no quotes.",
    contents: [{ role: "user", parts: [{ text: `CUSTOMER MESSAGE:
${m.text.slice(0, 500)}

NOTE:
${note}` }] }],
    temperature: 0,
  });
  return res.ok && res.text.trim() ? res.text.trim().slice(0, 600) : note;
}

/**
 * Live translation between the buyer and the assigned agent.
 * Buyer messages are always checked (the browser locale is only a guess); the detected language is saved
 * as buyer_lang so agent replies go back in the language the buyer actually writes.
 * The translation is stored on the message row (the agent views read it from there). Agent replies are also sent
 * into the group as the bot, addressed only to the buyer (`toUserIds`), so the buyer's live chat shows them.
 */
export async function relayTranslation(conversationId: string, role: "buyer" | "agent", text: string, messageId: string) {
  const [c] = await sql<{ business_id: string; nx_group_id: string; guest_nx_id: string; buyer_lang: string; agent_nx: string | null; agent_lang: string | null }[]>`
    select c.business_id, c.nx_group_id, c.guest_nx_id, c.buyer_lang, u.nx_user_id as agent_nx, u.lang as agent_lang
    from conversations c left join users u on u.id = c.assigned_user_id
    where c.id = ${conversationId} and c.status = 'agent'
  `;
  if (!c?.agent_nx || !c.agent_lang) return;
  if (role === "agent" && baseLang(c.buyer_lang) === baseLang(c.agent_lang)) return;

  const to = role === "buyer" ? c.agent_lang : c.buyer_lang;
  const out = await translate(text, to);
  if (!out) return;
  if (role === "buyer" && baseLang(out.source) !== baseLang(c.buyer_lang)) {
    await sql`update conversations set buyer_lang = ${out.source} where id = ${conversationId}`;
  }
  if (!out.translation) return;
  await sql`update messages set translation = ${out.translation} where id = ${messageId}`;
  if (role === "buyer") return;
  try {
    await sendGroupText(nxId.bot(c.business_id), c.nx_group_id, `Translated: ${out.translation}`, [c.guest_nx_id]);
  } catch (err) {
    console.error("[translate] send failed", err);
  }
}
