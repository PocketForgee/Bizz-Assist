import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, json } from "@/lib/http";
import type { LearnedRow } from "@/lib/qa";

export const GET = handle(async (req: Request) => {
  const user = await requireUser(req, { role: "owner" });
  const items = await sql<LearnedRow[]>`
    select s.id, s.conversation_id, s.question, s.answer, s.status, s.duplicate_of, k.title as duplicate_title, s.created_at
    from learned_suggestions s left join knowledge_items k on k.id = s.duplicate_of
    where s.business_id = ${user.business_id} and s.status = 'pending'
    order by s.created_at desc limit 200
  `;
  return json({ items });
});
