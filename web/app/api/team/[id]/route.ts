import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, HttpError, json, requireUuid } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** Removes an agent. Their open chats go back to the waiting queue. */
export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const owner = await requireUser(req, { role: "owner" });
  const id = requireUuid((await ctx.params).id, "member");
  const removed = await sql.begin(async (tx) => {
    await tx`
      update conversations set status = 'waiting', assigned_user_id = null, waiting_since = now()
      where business_id = ${owner.business_id} and assigned_user_id = ${id} and status = 'agent'
    `;
    return tx`delete from users where id = ${id} and business_id = ${owner.business_id} and role = 'agent' returning id`;
  });
  if (!removed.length) throw new HttpError(404, "Unknown agent.");
  return json({ ok: true });
});
