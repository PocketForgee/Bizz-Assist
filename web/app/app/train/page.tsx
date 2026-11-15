import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { limitFor } from "@/lib/plans";
import type { KnowledgeRow, LearnedRow, QaRow } from "@/lib/qa";
import { publicAction, type ApiActionRow } from "@/lib/action-public";
import { TrainTabs, type TrainTab } from "./train-tabs";

export const metadata: Metadata = { title: "Train" };

const TABS: TrainTab[] = ["website", "documents", "qa", "actions", "learned"];

export default async function TrainPage({ searchParams }: { searchParams: Promise<{ tab?: string; ask?: string }> }) {
  const user = await requirePageUser({ owner: true });
  const { tab, ask } = await searchParams;
  const b = user.business_id;

  const [web, docs, qa, actions, learned] = await Promise.all([
    sql<KnowledgeRow[]>`select id, source, title, url, status, error, length(content)::int as chars, updated_at from knowledge_items where business_id = ${b} and source = 'web' order by url`,
    sql<KnowledgeRow[]>`select id, source, title, url, status, error, length(content)::int as chars, updated_at from knowledge_items where business_id = ${b} and source = 'doc' order by updated_at desc`,
    sql<QaRow[]>`select id, title as question, content as answer, alternatives, source, updated_at from knowledge_items where business_id = ${b} and source in ('qa', 'learned') order by updated_at desc`,
    sql<ApiActionRow[]>`select * from api_actions where business_id = ${b} order by created_at`,
    sql<LearnedRow[]>`
      select s.id, s.conversation_id, s.question, s.answer, s.status, s.duplicate_of, k.title as duplicate_title, s.created_at
      from learned_suggestions s left join knowledge_items k on k.id = s.duplicate_of
      where s.business_id = ${b} and s.status = 'pending' order by s.created_at desc limit 200`,
  ]);

  const initialTab = TABS.includes(tab as TrainTab) ? (tab as TrainTab) : learned.length ? "learned" : "qa";
  const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

  return (
    <TrainTabs
      tab={initialTab}
      ask={typeof ask === "string" ? ask.slice(0, 500) : undefined}
      web={plain(web)}
      docs={plain(docs)}
      qa={plain(qa)}
      actions={actions.map(publicAction)}
      learned={plain(learned)}
      limits={{ pages: limitFor(user.plan, "pages"), qa: limitFor(user.plan, "qa"), actions: limitFor(user.plan, "actions") }}
    />
  );
}
