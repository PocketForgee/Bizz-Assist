import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Card, EmptyState, SubNav } from "@/components/ui";

export const metadata: Metadata = { title: "Analytics" };

// Chart colours, checked with the dataviz palette validator (light surface, CVD-safe pair).
const AI = "var(--primary)"; // the one accent: what the assistant solved
const HUMAN = "var(--sienna)"; // the second series: handed to a person

const REASON: Record<string, string> = {
  no_info: "Knowledge didn't cover it",
  keyword: "Customer asked for a person",
  tool: "Bot chose to hand over",
  llm_error: "AI error",
  plan_limit: "Monthly AI replies used up",
};

type Day = { day: string; total: number; ai: number };

function fmtWait(sec: number | null): string {
  if (sec == null) return "–";
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  return `${(sec / 3600).toFixed(1)} h`;
}

const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// shortcut: days are UTC days; use the business's time zone if owners outside UTC find the bars off by a day.
export default async function AnalyticsPage() {
  const user = await requirePageUser({ owner: true });
  const b = user.business_id;

  const [days, [t], reasons, gaps] = await Promise.all([
    // A conversation counts once the buyer has written. "AI" = it never went to the human queue.
    sql<Day[]>`
      with days as (
        select generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') as day
      ), handled as (
        select date_trunc('day', c.created_at) as day, c.waiting_since is null as by_ai
        from conversations c
        where c.business_id = ${b} and c.created_at >= date_trunc('day', now()) - interval '13 days'
          and exists (select 1 from messages m where m.conversation_id = c.id and m.sender_role = 'buyer')
      )
      select to_char(d.day, 'YYYY-MM-DD') as day,
             count(h.day)::int as total,
             (count(h.day) filter (where h.by_ai))::int as ai
      from days d left join handled h on h.day = d.day
      group by d.day order by d.day
    `,
    sql<{ convs: number; ai: number; wait_sec: number | null; rated: number; rating: number | null; happy: number; learned: number; pending: number }[]>`
      with c as (
        select * from conversations c
        where c.business_id = ${b} and c.created_at >= now() - interval '30 days'
          and exists (select 1 from messages m where m.conversation_id = c.id and m.sender_role = 'buyer')
      )
      select
        (select count(*)::int from c) as convs,
        (select count(*)::int from c where waiting_since is null) as ai,
        (select extract(epoch from avg(claimed_at - waiting_since))::float from c where claimed_at is not null) as wait_sec,
        (select count(rating)::int from c) as rated,
        (select avg(rating)::float from c) as rating,
        (select count(*)::int from c where rating >= 4) as happy,
        (select count(*)::int from knowledge_items where business_id = ${b} and source = 'learned') as learned,
        (select count(*)::int from learned_suggestions where business_id = ${b} and status = 'pending') as pending
    `,
    sql<{ reason: string; n: number }[]>`
      select coalesce(detail->>'reason', 'tool') as reason, count(*)::int as n
      from ai_events
      where business_id = ${b} and kind = 'escalated' and created_at >= now() - interval '30 days'
      group by 1 order by n desc
    `,
    // Knowledge gaps: the buyer message just before each "knowledge didn't cover it" handover.
    sql<{ id: string; created_at: Date; question: string | null }[]>`
      select e.id, e.created_at,
        (select m.text from messages m
          where m.conversation_id = e.conversation_id and m.sender_role = 'buyer' and m.created_at <= e.created_at
          order by m.created_at desc limit 1) as question
      from ai_events e
      where e.business_id = ${b} and e.kind = 'escalated' and e.detail->>'reason' = 'no_info'
        and e.created_at >= now() - interval '30 days'
      order by e.created_at desc limit 10
    `,
  ]);

  const max = Math.max(1, ...days.map((d) => d.total));
  const pct = t.convs ? Math.round((t.ai / t.convs) * 100) : null;
  const csat = t.rated ? Math.round((t.happy / t.rated) * 100) : null;
  const reasonTotal = reasons.reduce((s, r) => s + r.n, 0);

  const stats = [
    { label: "Solved by AI", value: pct == null ? "–" : `${pct}%`, sub: `${t.ai} of ${t.convs} chats` },
    { label: "Conversations", value: String(t.convs), sub: "last 30 days" },
    { label: "Average wait for a person", value: fmtWait(t.wait_sec), sub: "from handover to claim" },
    { label: "Customer satisfaction", value: csat == null ? "–" : `${csat}%`, sub: t.rated ? `${t.rated} ratings · ${t.rating?.toFixed(1)} / 5` : "no ratings yet" },
    { label: "Learned answers", value: String(t.learned), sub: t.pending ? `${t.pending} waiting for review` : "from agent replies" },
  ];

  return (
    <>
      <SubNav title="Analytics" lead="Last 30 days, unless a chart says otherwise" />
      <div className="stagger mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map((s, n) => (
          <Card key={s.label} className="p-5">
            <p className="t-caption text-ink-48">{s.label}</p>
            <p className={n === 0 ? "t-figure mt-3 text-primary" : "t-figure mt-3 text-ink"}>{s.value}</p>
            <p className="t-fine mt-1 text-ink-48">{s.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="t-body-strong">Who solved each chat, last 14 days</h2>
          <ul className="t-caption flex gap-4 text-ink-80" aria-label="Legend">
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm" style={{ background: AI }} aria-hidden /> AI
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm" style={{ background: HUMAN }} aria-hidden /> Handed to a person
            </li>
          </ul>
        </div>
        {t.convs === 0 && days.every((d) => d.total === 0) ? (
          <EmptyState line="Bars show here once customers start chatting." />
        ) : (
          <>
            <div className="flex h-44 items-end gap-1.5 border-b border-hairline" role="list" aria-label="Chats per day">
              {days.map((d) => {
                const human = d.total - d.ai;
                const label = `${dayLabel(d.day)}: ${d.total} chats, ${d.ai} by AI, ${human} by a person`;
                return (
                  <div key={d.day} role="listitem" tabIndex={0} aria-label={label} className="group relative flex h-full flex-1 flex-col justify-end outline-none">
                    {/* the hover target is the whole column, wider and taller than the bar */}
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-sm bg-ink px-2 py-1 text-[12px] text-white group-hover:block group-focus-visible:block">
                      {dayLabel(d.day)} · {d.ai} AI · {human} person
                    </span>
                    {human > 0 && <div className="rounded-t-[4px]" style={{ height: `${(human / max) * 100}%`, background: HUMAN, marginBottom: d.ai ? 2 : 0 }} />}
                    {d.ai > 0 && <div className={human ? "" : "rounded-t-[4px]"} style={{ height: `${(d.ai / max) * 100}%`, background: AI }} />}
                  </div>
                );
              })}
            </div>
            <div className="t-fine mt-1.5 flex justify-between text-ink-48" aria-hidden>
              <span>{dayLabel(days[0].day)}</span>
              <span>Today</span>
            </div>
            <details className="mt-3">
              <summary className="t-caption cursor-pointer text-primary">Show as table</summary>
              <div className="mt-2 overflow-x-auto"><table className="t-caption w-full min-w-[420px] text-left tabular-nums">
                <thead className="text-ink-48">
                  <tr>
                    <th className="py-1 font-normal">Day</th>
                    <th className="py-1 font-normal">Chats</th>
                    <th className="py-1 font-normal">AI</th>
                    <th className="py-1 font-normal">Person</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => (
                    <tr key={d.day} className="border-t border-divider">
                      <td className="py-1">{dayLabel(d.day)}</td>
                      <td className="py-1">{d.total}</td>
                      <td className="py-1">{d.ai}</td>
                      <td className="py-1">{d.total - d.ai}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </details>
          </>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-0">
          <div className="border-b border-divider px-6 py-4">
            <h2 className="t-body-strong">Questions the bot couldn&apos;t answer</h2>
            <p className="t-caption text-ink-48">Add an answer and the bot handles them next time.</p>
          </div>
          {gaps.length === 0 ? (
            <EmptyState line="No knowledge gaps in the last 30 days." />
          ) : (
            <ul className="divide-y divide-divider">
              {gaps.map((g) => (
                <li key={g.id} className="flex items-start gap-4 px-6 py-3">
                  <p className="t-caption min-w-0 flex-1 text-ink-80">{g.question ?? "(no message)"}</p>
                  {g.question && (
                    <Link href={`/app/train?tab=qa&ask=${encodeURIComponent(g.question.slice(0, 500))}`} className="t-caption min-h-11 shrink-0 text-primary hover:underline">
                      Add answer
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="t-body-strong mb-4">Why chats went to a person</h2>
          {reasonTotal === 0 ? (
            <EmptyState line="No handovers in the last 30 days." />
          ) : (
            <ul className="flex flex-col gap-3">
              {reasons.map((r) => (
                <li key={r.reason}>
                  <div className="t-caption flex justify-between">
                    <span className="text-ink-80">{REASON[r.reason] ?? r.reason}</span>
                    <span className="tabular-nums text-ink-48">{r.n}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-divider">
                    <div className="h-full rounded-full" style={{ width: `${(r.n / reasonTotal) * 100}%`, background: HUMAN }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
