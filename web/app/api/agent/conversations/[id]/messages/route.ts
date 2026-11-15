import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, HttpError, json, readJson, requireUuid, str } from "@/lib/http";
import { sendGroupText } from "@/lib/nexconn";
import { relayTranslation } from "@/lib/ai/translate";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Agent reply (web inbox and Android app). Sent into the Nexconn group as the agent through the Server API,
 * stored at once so it shows without waiting for the webhook; the webhook copy is dropped by nx_message_id.
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const id = requireUuid((await ctx.params).id, "conversation");
  const text = str(await readJson(req), "text", { min: 1, max: 2000, label: "Message" }).trim();
  if (!text) throw new HttpError(400, "Write a message first.");

  const [conv] = await sql<{ nx_group_id: string; status: string; assigned_user_id: string | null }[]>`
    select nx_group_id, status, assigned_user_id from conversations where id = ${id} and business_id = ${user.business_id}
  `;
  if (!conv) throw new HttpError(404, "Unknown conversation.");
  if (conv.status !== "agent" || conv.assigned_user_id !== user.id) throw new HttpError(409, "Claim this chat before replying.");

  let nxId: string | null;
  try {
    nxId = await sendGroupText(user.nx_user_id, conv.nx_group_id, text);
  } catch (err) {
    console.error("[agent] send failed", err);
    throw new HttpError(502, "The message didn't send. Try again.");
  }

  const nxMessageId = nxId ?? `local-${randomUUID()}`;
  let [message] = await sql<{ id: string; created_at: string }[]>`
    insert into messages (nx_message_id, conversation_id, sender_role, sender_nx_id, text)
    values (${nxMessageId}, ${id}, 'agent', ${user.nx_user_id}, ${text})
    on conflict (nx_message_id) do nothing
    returning id, created_at
  `;
  if (message) {
    const messageId = message.id;
    after(() => relayTranslation(id, "agent", text, messageId).catch((err) => console.error("[translate]", err)));
  } else {
    // the webhook stored it first and already handles the translation
    [message] = await sql<{ id: string; created_at: string }[]>`select id, created_at from messages where nx_message_id = ${nxMessageId}`;
  }
  return json({ message: { id: message.id, role: "agent", text, translation: null, created_at: message.created_at } });
});
