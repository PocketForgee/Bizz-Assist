import { sql } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, json, readJson } from "@/lib/http";
import { assertLimit } from "@/lib/plans";
import { parseWidgetPatch, type Widget } from "@/lib/widgets";

export const GET = handle(async (req: Request) => {
  const user = await requireUser(req);
  const widgets = await sql<Widget[]>`
    select * from widgets where business_id = ${user.business_id} order by created_at
  `;
  return json({ widgets });
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser(req, { role: "owner" });
  const p = parseWidgetPatch({ name: "New widget", ...(await readJson(req)) });

  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from widgets where business_id = ${user.business_id}`;
  assertLimit(user.plan, "widgets", n);

  const [widget] = await sql<Widget[]>`
    insert into widgets (business_id, name, type, color, title, greeting, avatar, languages, persona, allowed_domains, escalation_keywords)
    values (
      ${user.business_id}, ${p.name!}, ${p.type ?? "widget"}, ${p.color ?? "#0066cc"},
      ${p.title ?? user.business_name}, ${p.greeting ?? "Hi! How can we help you today?"}, ${p.avatar ?? null},
      ${p.languages ?? []}, ${p.persona ?? ""}, ${p.allowed_domains ?? []},
      ${p.escalation_keywords ?? ["human", "agent", "person"]}
    )
    returning *
  `;
  return json({ widget }, 201);
});
