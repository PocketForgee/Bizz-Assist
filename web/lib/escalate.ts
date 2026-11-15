import { sql } from "./db";
import { nxId } from "./ids";
import { sendGroupText, sendSystemText } from "./nexconn";
import { summarizeConversation } from "./ai/summarize";

export type EscalationReason = "keyword" | "tool" | "llm_error" | "plan_limit" | "no_info";

const HANDOFF_DEFAULT = "I'm connecting you with a member of our team.";

/**
 * Moves a bot conversation to the human queue: handoff message with queue position,
 * summary for the agent (Lite model), and a system-channel alert to the business's agents (push on Android).
 * Idempotent: only a conversation still in `bot` status is moved.
 */
export async function escalate(conversationId: string, reason: EscalationReason, messageToCustomer?: string) {
  const [conv] = await sql<{ id: string; business_id: string; nx_group_id: string; waiting_since: Date; buyer_lang: string }[]>`
    update conversations set status = 'waiting', waiting_since = now()
    where id = ${conversationId} and status = 'bot'
    returning id, business_id, nx_group_id, waiting_since, buyer_lang
  `;
  if (!conv) return;

  const [{ position }] = await sql<{ position: number }[]>`
    select count(*)::int as position from conversations
    where business_id = ${conv.business_id} and status = 'waiting' and waiting_since <= ${conv.waiting_since}
  `;

  const lead = (messageToCustomer || HANDOFF_DEFAULT).trim();
  const text = position > 1 ? `${lead} You're number ${position} in line.` : `${lead} You're next in line.`;
  const bot = nxId.bot(conv.business_id);

  try {
    const msgId = await sendGroupText(bot, conv.nx_group_id, text);
    await sql`
      insert into messages (nx_message_id, conversation_id, sender_role, sender_nx_id, text)
      values (${msgId ?? `srv${crypto.randomUUID().replace(/-/g, "")}`}, ${conv.id}, 'bot', ${bot}, ${text})
      on conflict (nx_message_id) do nothing
    `;
  } catch (err) {
    console.error("[escalate] handoff message failed", err);
  }

  await sql`
    insert into ai_events (business_id, conversation_id, kind, detail)
    values (${conv.business_id}, ${conv.id}, 'escalated', ${sql.json({ reason })})
  `;

  const summary = await summarizeConversation(conv.id, reason);
  await sql`update conversations set summary = ${sql.json(summary)} where id = ${conv.id}`;

  try {
    const agents = await sql<{ nx_user_id: string }[]>`select nx_user_id from users where business_id = ${conv.business_id}`;
    if (agents.length) {
      const alert = `New chat waiting (${conv.buyer_lang.toUpperCase()}): ${summary.issue}`.slice(0, 500);
      await sendSystemText(bot, agents.map((a) => a.nx_user_id), alert, alert.slice(0, 120));
    }
  } catch (err) {
    console.error("[escalate] agent alert failed", err);
  }
}
