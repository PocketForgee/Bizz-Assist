import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { limitFor } from "@/lib/plans";
import type { QaRow } from "@/lib/qa";
import { QaManager } from "./qa-manager";

export const metadata: Metadata = { title: "Train" };

// Phase 1: Q&A. Website, Documents, API Actions and Learned tabs arrive in Phase 2.
export default async function TrainPage() {
  const user = await requirePageUser({ owner: true });
  const items = await sql<QaRow[]>`
    select id, title as question, content as answer, source, updated_at from knowledge_items
    where business_id = ${user.business_id} and source in ('qa', 'learned')
    order by updated_at desc
  `;
  return <QaManager initial={JSON.parse(JSON.stringify(items))} limit={limitFor(user.plan, "qa")} />;
}
