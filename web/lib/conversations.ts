// Agent-side conversation operations. Every query is scoped to the caller's business.
import { sql } from "./db";
import { HttpError } from "./http";
import { nxId } from "./ids";
import { enqueue } from "./queue";
import { issueToken, joinGroup, sendGroupText } from "./nexconn";
import { learnFromConversation } from "./ai/learn";
import { inBuyerLanguage } from "./ai/translate";
import type { SessionUser } from "./auth";

export type QueueRow = {
  id: string;
  status: "bot" | "waiting" | "agent" | "closed";
  nx_group_id: string;
  buyer_lang: string;
  widget: string;
  summary: { issue?: string } | null;
  waiting_since: string | null;
  closed_at: string | null;
  created_at: string;
  assigned_user_id: string | null;
  assigned_name: string | null;
  rating: number | null;
  last_text: string | null;
  last_at: string | null;
};

type Actor = Pick<SessionUser, "id" | "business_id" | "name" | "nx_user_id" | "role">;

/** Bot-voiced status line into the buyer's chat, stored like any bot message. */
async function botNote(businessId: string, conversationId: string, groupId: string, text: string) {
  const bot = nxId.bot(businessId);
  try {
    text = await inBuyerLanguage(conversationId, text);
    const msgId = await sendGroupText(bot, groupId, text);
    await sql`
      insert into messages (nx_message_id, conversation_id, sender_role, sender_nx_id, text)
      values (${msgId ?? `srv${crypto.randomUUID().replace(/-/g, "")}`}, ${conversationId}, 'bot', ${bot}, ${text})
      on conflict (nx_message_id) do nothing
    `;
  } catch (err) {
    console.error("[conversations] bot note failed", err);
  }
}

/** The atomic part of a claim: exactly one caller gets the row back. */
export async function takeConversation(user: Pick<Actor, "id" | "business_id">, conversationId: string) {
  const [conv] = await sql<{ id: string; nx_group_id: string }[]>`
    update conversations set status = 'agent', assigned_user_id = ${user.id}, claimed_at = now()
    where id = ${conversationId} and business_id = ${user.business_id} and status = 'waiting'
    returning id, nx_group_id
  `;
  return conv ?? null;
}

/**
 * Atomic claim: only one agent wins (`WHERE status = 'waiting'`). The winner joins the Nexconn group,
 * so the chat appears in their ChatUI on web and Android.
 */
export async function claimConversation(user: Actor, conversationId: string): Promise<{ nx_group_id: string }> {
  const conv = await takeConversation(user, conversationId);
  if (!conv) {
    const [exists] = await sql`select 1 from conversations where id = ${conversationId} and business_id = ${user.business_id}`;
    throw exists ? new HttpError(409, "Another agent already took this chat.") : new HttpError(404, "Unknown conversation.");
  }
  try {
    await issueToken(user.nx_user_id, user.name); // make sure the Nexconn user exists before joining
    await joinGroup(conv.nx_group_id, [user.nx_user_id]);
  } catch (err) {
    await sql`update conversations set status = 'waiting', assigned_user_id = null, claimed_at = null where id = ${conv.id} and assigned_user_id = ${user.id}`;
    console.error("[claim] join failed", err);
    throw new HttpError(502, "Couldn't join the chat. Try again.");
  }
  const first = user.name.split(/\s+/)[0] || "An agent";
  await botNote(user.business_id, conv.id, conv.nx_group_id, `${first} from our team has joined the chat.`);
  return { nx_group_id: conv.nx_group_id };
}

/** Closes a chat. Agents close their own chats; the owner can close any. Starts the learning job when an agent took part. */
export async function resolveConversation(user: Actor, conversationId: string): Promise<void> {
  const [conv] = await sql<{ id: string; nx_group_id: string; resolved_by: "ai" | "agent" }[]>`
    update conversations
    set status = 'closed', closed_at = now(),
        resolved_by = case when assigned_user_id is null then 'ai' else 'agent' end
    where id = ${conversationId} and business_id = ${user.business_id}
      and status in ('bot', 'waiting', 'agent')
      and (${user.role === "owner"} or assigned_user_id = ${user.id})
    returning id, nx_group_id, resolved_by
  `;
  if (!conv) throw new HttpError(409, "This chat is already closed or belongs to another agent.");
  await botNote(user.business_id, conv.id, conv.nx_group_id, "This chat is now closed. Thanks for reaching out!");
  if (conv.resolved_by === "agent") void enqueue(`learn:${conv.id}`, async () => void (await learnFromConversation(conv.id)));
}
