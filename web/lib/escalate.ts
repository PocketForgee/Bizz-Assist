import { sql } from "./db";
import { nxId } from "./ids";
import { sendGroupText } from "./nexconn";

export type EscalationReason = "keyword" | "tool" | "llm_error" | "plan_limit" | "no_info";

const HANDOFF_DEFAULT = "I'm connecting you with a member of our team.";

/**
 * Moves a bot conversation to the human queue and tells the buyer their place in line.
 * Idempotent: only a conversation still in `bot` status is moved.
 * Phase 2 adds the summary (ai/summarize.ts) and the system alert to agents here.
 */
export async function escalate(conversationId: string, reason: EscalationReason, messageToCustomer?: string) {
  const [conv] = await sql<{ id: string; business_id: string; nx_group_id: string; waiting_since: Date }[]>`
    update conversations set status = 'waiting', waiting_since = now()
    where id = ${conversationId} and status = 'bot'
    returning id, business_id, nx_group_id, waiting_since
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
}
