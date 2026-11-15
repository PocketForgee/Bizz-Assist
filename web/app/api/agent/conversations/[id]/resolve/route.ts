import { requireUser } from "@/lib/auth";
import { handle, json, requireUuid } from "@/lib/http";
import { resolveConversation } from "@/lib/conversations";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const id = requireUuid((await ctx.params).id, "conversation");
  await resolveConversation(user, id);
  return json({ ok: true });
});
