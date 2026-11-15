import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, HttpError, json, readJson, requireUuid, str } from "@/lib/http";
import { assertLimit } from "@/lib/plans";

type Ctx = { params: Promise<{ id: string }> };

/** { action: "approve", question?, answer? } -> live knowledge (source learned) on the very next reply. { action: "reject" }. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req, { role: "owner" });
  const id = requireUuid((await ctx.params).id, "suggestion");
  const body = await readJson(req);

  if (body.action === "reject") {
    const rows = await sql`update learned_suggestions set status = 'rejected' where id = ${id} and business_id = ${user.business_id} and status = 'pending' returning id`;
    if (!rows.length) throw new HttpError(404, "This suggestion was already handled.");
    return json({ ok: true });
  }
  if (body.action !== "approve") throw new HttpError(400, "Action must be approve or reject.");

  const [s] = await sql<{ question: string; answer: string; conversation_id: string | null }[]>`
    select question, answer, conversation_id from learned_suggestions where id = ${id} and business_id = ${user.business_id} and status = 'pending'
  `;
  if (!s) throw new HttpError(404, "This suggestion was already handled.");
  const question = "question" in body ? str(body, "question", { max: 500, label: "a question" }) : s.question;
  const answer = "answer" in body ? str(body, "answer", { max: 5000, label: "an answer" }) : s.answer;

  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from knowledge_items where business_id = ${user.business_id} and source in ('qa', 'learned')
  `;
  assertLimit(user.plan, "qa", n);

  const item = await sql.begin(async (tx) => {
    const done = await tx`update learned_suggestions set status = 'approved', question = ${question}, answer = ${answer} where id = ${id} and status = 'pending' returning id`;
    if (!done.length) throw new HttpError(409, "This suggestion was already handled.");
    const [k] = await tx`
      insert into knowledge_items (business_id, source, title, content, conversation_id)
      values (${user.business_id}, 'learned', ${question}, ${answer}, ${s.conversation_id})
      returning id
    `;
    return k;
  });
  return json({ ok: true, knowledgeId: item.id });
});
