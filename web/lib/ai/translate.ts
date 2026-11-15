import { sql } from "../db";
import { nxId } from "../ids";
import { baseLang, langName } from "../langs";
import { sendGroupText } from "../nexconn";
import { askLLM, MODEL_LITE } from "./llm";

const SAME = "<<SAME>>";

/** Lite-model translation. Null when the text is already in `to`, or the model fails. */
export async function translate(text: string, to: string): Promise<string | null> {
  const target = langName(baseLang(to));
  const res = await askLLM({
    model: MODEL_LITE(),
    system:
      `Translate the customer-support chat message into ${target}. Reply with the translation only, no notes or quotes. ` +
      `Keep order numbers, emails, links and product names unchanged. If the message is already in ${target}, reply with exactly ${SAME}.`,
    contents: [{ role: "user", parts: [{ text }] }],
    temperature: 0,
  });
  if (!res.ok || !res.text || res.text.includes(SAME)) return null;
  return res.text.slice(0, 4000);
}

/**
 * Live translation between buyer and the assigned agent when their languages differ.
 * The copy goes into the group as the bot, addressed only to the reader (`toUserIds`),
 * and is not stored: the original stays the record.
 */
export async function relayTranslation(conversationId: string, role: "buyer" | "agent", text: string) {
  const [c] = await sql<{ business_id: string; nx_group_id: string; guest_nx_id: string; buyer_lang: string; agent_nx: string | null; agent_lang: string | null }[]>`
    select c.business_id, c.nx_group_id, c.guest_nx_id, c.buyer_lang, u.nx_user_id as agent_nx, u.lang as agent_lang
    from conversations c left join users u on u.id = c.assigned_user_id
    where c.id = ${conversationId} and c.status = 'agent'
  `;
  if (!c?.agent_nx || !c.agent_lang || baseLang(c.buyer_lang) === baseLang(c.agent_lang)) return;

  const to = role === "buyer" ? c.agent_lang : c.buyer_lang;
  const reader = role === "buyer" ? c.agent_nx : c.guest_nx_id;
  const out = await translate(text, to);
  if (!out) return;
  try {
    await sendGroupText(nxId.bot(c.business_id), c.nx_group_id, `Translated: ${out}`, [reader]);
  } catch (err) {
    console.error("[translate] send failed", err);
  }
}
