import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, json } from "@/lib/http";
import type { KnowledgeRow } from "@/lib/qa";

/** Website pages or documents for the Train tabs (content itself is not sent to the browser). */
export const GET = handle(async (req: Request) => {
  const user = await requireUser(req, { role: "owner" });
  const source = new URL(req.url).searchParams.get("source") === "doc" ? "doc" : "web";
  const items = await sql<KnowledgeRow[]>`
    select id, source, title, url, status, error, length(content)::int as chars, updated_at from knowledge_items
    where business_id = ${user.business_id} and source = ${source}
    order by ${source === "web" ? sql`url` : sql`updated_at desc`}
  `;
  return json({ items });
});
