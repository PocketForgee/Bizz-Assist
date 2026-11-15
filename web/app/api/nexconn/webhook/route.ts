import { after } from "next/server";
import { sql } from "@/lib/db";
import { roleFromNxId } from "@/lib/ids";
import { verifyWebhook } from "@/lib/nexconn";
import { Deduper, parseMessageSend, type IncomingText } from "@/lib/webhook";
import { enqueue } from "@/lib/queue";
import { answerConversation } from "@/lib/ai/answer";
import { relayTranslation } from "@/lib/ai/translate";

const deduper = new Deduper();

// Nexconn waits 5 s and retries twice: verify, answer 200 at once, do the work in after().
export async function POST(req: Request): Promise<Response> {
  if (!verifyWebhook(req.headers)) return Response.json({ error: "bad signature" }, { status: 401 });

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: true }); // not JSON: nothing we handle, don't make Nexconn retry
  }

  const items = parseMessageSend(body).filter((m) => deduper.firstSeen(m.messageId));
  if (items.length) {
    after(async () => {
      for (const m of items) {
        try {
          await ingest(m);
        } catch (err) {
          console.error("[webhook] ingest failed", m.messageId, err);
        }
      }
    });
  }
  return Response.json({ ok: true });
}

async function ingest(m: IncomingText) {
  const role = roleFromNxId(m.fromUserId);
  if (role !== "buyer" && role !== "agent") return; // bot messages are our own server sends

  const [conv] = await sql<{ id: string; business_id: string; status: string; guest_nx_id: string }[]>`
    select id, business_id, status, guest_nx_id from conversations where nx_group_id = ${m.groupId}
  `;
  if (!conv) return;
  if (role === "buyer" && m.fromUserId !== conv.guest_nx_id) return;
  if (role === "agent") {
    const [agent] = await sql`select 1 from users where nx_user_id = ${m.fromUserId} and business_id = ${conv.business_id}`;
    if (!agent) return;
  }

  const inserted = await sql`
    insert into messages (nx_message_id, conversation_id, sender_role, sender_nx_id, text)
    values (${m.messageId}, ${conv.id}, ${role}, ${m.fromUserId}, ${m.text})
    on conflict (nx_message_id) do nothing
    returning id
  `;
  if (!inserted.length) return;

  if (role === "buyer" && conv.status === "bot") {
    void enqueue(conv.id, () => answerConversation(conv.id));
  } else if (conv.status === "agent") {
    await relayTranslation(conv.id, role, m.text, inserted[0].id);
  }
}
