import { sql } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, HttpError, json, readJson, requireUuid } from "@/lib/http";
import { parseWidgetPatch, type Widget } from "@/lib/widgets";
import { forgetWidgetPolicy } from "@/lib/widget-policy";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const id = requireUuid((await ctx.params).id, "widget");
  const [widget] = await sql<Widget[]>`select * from widgets where id = ${id} and business_id = ${user.business_id}`;
  if (!widget) throw new HttpError(404, "Unknown widget.");
  return json({ widget });
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req, { role: "owner" });
  const id = requireUuid((await ctx.params).id, "widget");
  const patch = parseWidgetPatch(await readJson(req));
  if (!Object.keys(patch).length) throw new HttpError(400, "Nothing to update.");

  const [widget] = await sql<Widget[]>`
    update widgets set ${sql(patch as Record<string, unknown>)}, updated_at = now()
    where id = ${id} and business_id = ${user.business_id}
    returning *
  `;
  if (!widget) throw new HttpError(404, "Unknown widget.");
  forgetWidgetPolicy(id);
  return json({ widget });
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req, { role: "owner" });
  const id = requireUuid((await ctx.params).id, "widget");
  const rows = await sql`delete from widgets where id = ${id} and business_id = ${user.business_id} returning id`;
  if (!rows.length) throw new HttpError(404, "Unknown widget.");
  forgetWidgetPolicy(id);
  return json({ ok: true });
});
