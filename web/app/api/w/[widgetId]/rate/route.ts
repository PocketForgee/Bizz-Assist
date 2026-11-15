import { sql } from "@/lib/db";
import { handle, HttpError, json, rateLimit, readJson, requireUuid } from "@/lib/http";
import { isGuestId } from "@/lib/ids";

type Ctx = { params: Promise<{ widgetId: string }> };

/** Public: the buyer rates their most recent closed chat once, 1–5. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  rateLimit(req, "w-rate", 10, 60_000);
  const widgetId = requireUuid((await ctx.params).widgetId, "widget");
  const body = await readJson(req);
  if (!isGuestId(body.guestId)) throw new HttpError(400, "Missing guest.");
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, "Rating must be 1 to 5.");
  const rows = await sql`
    update conversations set rating = ${rating}
    where id = (
      select id from conversations
      where widget_id = ${widgetId} and guest_nx_id = ${body.guestId} and status = 'closed'
      order by closed_at desc nulls last limit 1
    ) and rating is null
    returning id
  `;
  if (!rows.length) throw new HttpError(409, "This chat was already rated.");
  return json({ ok: true });
});
