import { sql } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, HttpError, json, readJson, requireUuid, str } from "@/lib/http";
import type { QaRow } from "@/lib/qa";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req, { role: "owner" });
  const id = requireUuid((await ctx.params).id, "entry");
  const body = await readJson(req);
  const question = str(body, "question", { max: 500, label: "a question" });
  const answer = str(body, "answer", { max: 5000, label: "an answer" });

  const [item] = await sql<QaRow[]>`
    update knowledge_items set title = ${question}, content = ${answer}, updated_at = now()
    where id = ${id} and business_id = ${user.business_id} and source in ('qa', 'learned')
    returning id, title as question, content as answer, source, updated_at
  `;
  if (!item) throw new HttpError(404, "Unknown entry.");
  return json({ item });
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req, { role: "owner" });
  const id = requireUuid((await ctx.params).id, "entry");
  const rows = await sql`
    delete from knowledge_items where id = ${id} and business_id = ${user.business_id} and source in ('qa', 'learned') returning id
  `;
  if (!rows.length) throw new HttpError(404, "Unknown entry.");
  return json({ ok: true });
});
