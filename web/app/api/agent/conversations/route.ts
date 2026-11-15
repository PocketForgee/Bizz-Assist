import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, json } from "@/lib/http";
import type { QueueRow } from "@/lib/conversations";

const TABS = ["waiting", "mine", "closed", "all"] as const;

/** Queue for the agent inbox (web + Android). Polled every 3 s. */
export const GET = handle(async (req: Request) => {
  const user = await requireUser(req);
  const t = new URL(req.url).searchParams.get("tab");
  const tab = (TABS as readonly string[]).includes(t ?? "") ? (t as (typeof TABS)[number]) : "waiting";

  const filter =
    tab === "waiting"
      ? sql`c.status = 'waiting'`
      : tab === "mine"
        ? sql`c.status = 'agent' and c.assigned_user_id = ${user.id}`
        : tab === "closed"
          ? sql`c.status = 'closed' and c.assigned_user_id is not null and (${user.role === "owner"} or c.assigned_user_id = ${user.id})`
          : sql`true`;
  const order = tab === "waiting" ? sql`c.waiting_since asc` : tab === "closed" ? sql`c.closed_at desc` : sql`coalesce(m.created_at, c.created_at) desc`;

  const rows = await sql<QueueRow[]>`
    select c.id, c.status, c.nx_group_id, c.buyer_lang, w.name as widget, c.summary, c.waiting_since, c.closed_at, c.created_at,
           c.assigned_user_id, u.name as assigned_name, c.rating, m.text as last_text, m.created_at as last_at
    from conversations c
    join widgets w on w.id = c.widget_id
    left join users u on u.id = c.assigned_user_id
    left join lateral (select text, created_at from messages where conversation_id = c.id order by created_at desc limit 1) m on true
    where c.business_id = ${user.business_id} and ${filter}
    order by ${order}
    limit 100
  `;
  const [counts] = await sql<{ waiting: number; mine: number }[]>`
    select count(*) filter (where status = 'waiting')::int as waiting,
           count(*) filter (where status = 'agent' and assigned_user_id = ${user.id})::int as mine
    from conversations where business_id = ${user.business_id}
  `;
  return json({ tab, rows, counts, now: new Date().toISOString() });
});
