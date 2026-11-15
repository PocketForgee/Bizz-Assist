import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, json, readJson } from "@/lib/http";
import { assertLimit } from "@/lib/plans";
import { parseActionInput } from "@/lib/action-input";
import { publicAction, type ApiActionRow } from "@/lib/action-public";

export const GET = handle(async (req: Request) => {
  const user = await requireUser(req, { role: "owner" });
  const rows = await sql<ApiActionRow[]>`select * from api_actions where business_id = ${user.business_id} order by created_at`;
  return json({ actions: rows.map(publicAction) });
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser(req, { role: "owner" });
  const a = parseActionInput(await readJson(req));
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from api_actions where business_id = ${user.business_id}`;
  assertLimit(user.plan, "actions", n);
  const [row] = await sql<ApiActionRow[]>`
    insert into api_actions (business_id, name, description, kind, method, url_template, params, headers_enc, sheet_match)
    values (${user.business_id}, ${a.name}, ${a.description}, ${a.kind}, ${a.method}, ${a.url_template},
            ${sql.json(a.params)}, ${a.headers_enc ?? null}, ${a.sheet_match ? sql.json(a.sheet_match) : null})
    returning *
  `;
  return json({ action: publicAction(row) }, 201);
});
