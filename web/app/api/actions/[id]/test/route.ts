import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, HttpError, json, rateLimit, readJson, requireUuid } from "@/lib/http";
import { runAction, type ApiAction } from "@/lib/actions";

type Ctx = { params: Promise<{ id: string }> };

/** Test button: runs the saved action with sample arguments and returns exactly what the bot would see. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req, { role: "owner" });
  rateLimit(req, "action-test", 20, 60_000);
  const id = requireUuid((await ctx.params).id, "action");
  const body = await readJson(req);
  const args = body.args && typeof body.args === "object" && !Array.isArray(body.args) ? (body.args as Record<string, unknown>) : {};
  const [action] = await sql<ApiAction[]>`select * from api_actions where id = ${id} and business_id = ${user.business_id}`;
  if (!action) throw new HttpError(404, "Unknown action.");
  const started = Date.now();
  const result = await runAction(action, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, String(v ?? "").slice(0, 500)])));
  return json({ ...result, ms: Date.now() - started });
});
