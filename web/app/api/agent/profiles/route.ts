import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, json, readJson } from "@/lib/http";
import { nxId } from "@/lib/ids";

const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && /^[A-Za-z0-9]{1,64}$/.test(x)).slice(0, 200) : []);

/**
 * ChatUI ServiceHooks backend: display names for users and groups, limited to the caller's business.
 * Unknown ids get no profile (ChatUI falls back to its default).
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser(req);
  const body = await readJson(req);
  const userIds = ids(body.userIds);
  const groupIds = ids(body.groupIds);
  const memberGroup = typeof body.membersOf === "string" ? body.membersOf : null;

  const users: { userId: string; name: string; avatarUrl?: string }[] = [];
  const bot = nxId.bot(user.business_id);
  const [biz] = await sql<{ name: string; logo_url: string | null }[]>`select name, logo_url from businesses where id = ${user.business_id}`;

  if (userIds.length) {
    if (userIds.includes(bot)) users.push({ userId: bot, name: `${biz.name} assistant`, ...(biz.logo_url ? { avatarUrl: biz.logo_url } : {}) });
    const agents = await sql<{ nx_user_id: string; name: string }[]>`
      select nx_user_id, name from users where business_id = ${user.business_id} and nx_user_id = any(${userIds})
    `;
    users.push(...agents.map((a) => ({ userId: a.nx_user_id, name: a.name })));
    const guests = await sql<{ guest_nx_id: string; buyer_lang: string }[]>`
      select distinct on (guest_nx_id) guest_nx_id, buyer_lang from conversations
      where business_id = ${user.business_id} and guest_nx_id = any(${userIds})
      order by guest_nx_id, created_at desc
    `;
    users.push(...guests.map((g) => ({ userId: g.guest_nx_id, name: `Customer ${g.guest_nx_id.slice(1, 5).toUpperCase()} · ${g.buyer_lang.toUpperCase()}` })));
  }

  let groups: { groupId: string; name: string; memberCount: number }[] = [];
  if (groupIds.length) {
    const rows = await sql<{ nx_group_id: string; guest_nx_id: string; buyer_lang: string; widget: string }[]>`
      select c.nx_group_id, c.guest_nx_id, c.buyer_lang, w.name as widget from conversations c join widgets w on w.id = c.widget_id
      where c.business_id = ${user.business_id} and c.nx_group_id = any(${groupIds})
    `;
    groups = rows.map((r) => ({ groupId: r.nx_group_id, name: `Customer ${r.guest_nx_id.slice(1, 5).toUpperCase()} · ${r.widget}`.slice(0, 64), memberCount: 3 }));
  }

  let members: { userId: string; nickname?: string }[] = [];
  if (memberGroup) {
    const [c] = await sql<{ guest_nx_id: string; assigned: string | null; assigned_name: string | null }[]>`
      select c.guest_nx_id, u.nx_user_id as assigned, u.name as assigned_name from conversations c left join users u on u.id = c.assigned_user_id
      where c.business_id = ${user.business_id} and c.nx_group_id = ${memberGroup}
    `;
    if (c) {
      members = [{ userId: bot, nickname: `${biz.name} assistant` }, { userId: c.guest_nx_id, nickname: "Customer" }];
      if (c.assigned) members.push({ userId: c.assigned, nickname: c.assigned_name ?? "Agent" });
    }
  }

  return json({ users, groups, members });
});
