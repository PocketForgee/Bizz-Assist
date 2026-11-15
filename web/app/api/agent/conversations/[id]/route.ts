import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, HttpError, json, requireUuid } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** Context pane: summary, buyer details and the transcript stored on our side. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const id = requireUuid((await ctx.params).id, "conversation");
  const [conversation] = await sql`
    select c.id, c.status, c.nx_group_id, c.guest_nx_id, c.buyer_lang, c.summary, c.rating, c.resolved_by,
           c.created_at, c.waiting_since, c.closed_at, c.assigned_user_id, u.name as assigned_name, w.name as widget
    from conversations c
    join widgets w on w.id = c.widget_id
    left join users u on u.id = c.assigned_user_id
    where c.id = ${id} and c.business_id = ${user.business_id}
  `;
  if (!conversation) throw new HttpError(404, "Unknown conversation.");
  const messages = await sql`
    select id, sender_role as role, text, translation, sources, created_at from messages
    where conversation_id = ${id} order by created_at limit 500
  `;
  return json({ conversation, messages });
});
