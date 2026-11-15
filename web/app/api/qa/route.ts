import { sql } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, json, readJson, str, strList } from "@/lib/http";
import { assertLimit } from "@/lib/plans";
import type { QaRow } from "@/lib/qa";

export const GET = handle(async (req: Request) => {
  const user = await requireUser(req);
  const items = await sql<QaRow[]>`
    select id, title as question, content as answer, alternatives, source, updated_at from knowledge_items
    where business_id = ${user.business_id} and source in ('qa', 'learned')
    order by updated_at desc
  `;
  return json({ items });
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser(req, { role: "owner" });
  const body = await readJson(req);
  const question = str(body, "question", { max: 500, label: "a question" });
  const answer = str(body, "answer", { max: 5000, label: "an answer" });
  const alternatives = strList(body, "alternatives", { maxItems: 10, maxLen: 300 });

  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from knowledge_items where business_id = ${user.business_id} and source in ('qa', 'learned')
  `;
  assertLimit(user.plan, "qa", n);

  const [item] = await sql<QaRow[]>`
    insert into knowledge_items (business_id, source, title, content, alternatives)
    values (${user.business_id}, 'qa', ${question}, ${answer}, ${alternatives})
    returning id, title as question, content as answer, alternatives, source, updated_at
  `;
  return json({ item }, 201);
});
