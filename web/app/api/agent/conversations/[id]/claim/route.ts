import { requireUser } from "@/lib/auth";
import { handle, json, requireUuid } from "@/lib/http";
import { claimConversation } from "@/lib/conversations";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const id = requireUuid((await ctx.params).id, "conversation");
  const { nx_group_id } = await claimConversation(user, id);
  return json({ ok: true, groupId: nx_group_id });
});
