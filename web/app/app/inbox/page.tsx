import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Card, Chip, EmptyState, SubNav } from "@/components/ui";

export const metadata: Metadata = { title: "Inbox" };

type Row = { id: string; status: "bot" | "waiting" | "agent" | "closed"; buyer_lang: string; widget: string; last_text: string | null; last_at: Date | null; created_at: Date };

const STATUS: Record<Row["status"], { label: string; tone: "neutral" | "warning" | "info" | "success" }> = {
  bot: { label: "With AI", tone: "neutral" },
  waiting: { label: "Waiting", tone: "warning" },
  agent: { label: "With agent", tone: "info" },
  closed: { label: "Closed", tone: "success" },
};

function ago(d: Date | null): string {
  if (!d) return "";
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

// Phase 1: read-only list of conversations. Phase 2 replaces this with the three-pane ChatUI inbox.
export default async function InboxPage() {
  const user = await requirePageUser();
  const rows = await sql<Row[]>`
    select c.id, c.status, c.buyer_lang, w.name as widget, c.created_at, m.text as last_text, m.created_at as last_at
    from conversations c
    join widgets w on w.id = c.widget_id
    left join lateral (
      select text, created_at from messages where conversation_id = c.id order by created_at desc limit 1
    ) m on true
    where c.business_id = ${user.business_id}
    order by (c.status = 'waiting') desc, coalesce(m.created_at, c.created_at) desc
    limit 100
  `;

  return (
    <>
      <SubNav title="Inbox" />
      <Card className="p-0">
        {rows.length === 0 ? (
          <EmptyState line="Conversations show up here as soon as a customer writes in." />
        ) : (
          <ul className="divide-y divide-divider">
            {rows.map((r) => (
              <li key={r.id} className="flex min-h-14 items-center gap-4 px-6 py-3">
                <Chip tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Chip>
                <Chip className="uppercase">{r.buyer_lang}</Chip>
                <p className="t-caption min-w-0 flex-1 truncate text-ink-80" dir="auto">
                  {r.last_text ?? "No messages yet"}
                </p>
                <span className="t-fine hidden text-ink-48 sm:inline">{r.widget}</span>
                <span className="t-fine w-20 text-right text-ink-48">{ago(r.last_at ?? r.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
