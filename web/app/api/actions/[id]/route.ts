import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, HttpError, json, readJson, requireUuid } from "@/lib/http";
import { parseActionInput } from "@/lib/action-input";
import { publicAction, type ApiActionRow } from "@/lib/action-public";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req, { role: "owner" });
  const id = requireUuid((await ctx.params).id, "action");
  const a = parseActionInput(await readJson(req));
  const [row] = await sql<ApiActionRow[]>`
    update api_actions set
      name = ${a.name}, description = ${a.description}, kind = ${a.kind}, method = ${a.method},
      url_template = ${a.url_template}, params = ${sql.json(a.params)},
      sheet_match = ${a.sheet_match ? sql.json(a.sheet_match) : null},
      headers_enc = ${a.kind === "sheet" ? null : a.headers_enc === undefined ? sql`headers_enc` : a.headers_enc}
    where id = ${id} and business_id = ${user.business_id}
    returning *
  `;
  if (!row) throw new HttpError(404, "Unknown action.");
  return json({ action: publicAction(row) });
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req, { role: "owner" });
  const id = requireUuid((await ctx.params).id, "action");
  const rows = await sql.begin(async (tx) => {
    await tx`update widgets set enabled_action_ids = array_remove(enabled_action_ids, ${id}::uuid) where business_id = ${user.business_id}`;
    return tx`delete from api_actions where id = ${id} and business_id = ${user.business_id} returning id`;
  });
  if (!rows.length) throw new HttpError(404, "Unknown action.");
  return json({ ok: true });
});
