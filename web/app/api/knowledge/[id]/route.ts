import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, HttpError, json, requireUuid } from "@/lib/http";
import { queueSync } from "@/lib/ingest/web";

type Ctx = { params: Promise<{ id: string }> };

/** Re-sync a website page. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req, { role: "owner" });
  const id = requireUuid((await ctx.params).id, "page");
  const rows = await sql`
    update knowledge_items set status = 'pending', error = null
    where id = ${id} and business_id = ${user.business_id} and source = 'web' returning id
  `;
  if (!rows.length) throw new HttpError(404, "Unknown page.");
  queueSync(user.business_id, [id]);
  return json({ ok: true });
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req, { role: "owner" });
  const id = requireUuid((await ctx.params).id, "item");
  const rows = await sql`
    delete from knowledge_items where id = ${id} and business_id = ${user.business_id} and source in ('web', 'doc') returning id
  `;
  if (!rows.length) throw new HttpError(404, "Unknown item.");
  return json({ ok: true });
});
