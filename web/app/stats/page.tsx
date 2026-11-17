import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "@/lib/db";
import { langName } from "@/lib/langs";
import { Mark } from "@/components/brand";
import { Card, EmptyState } from "@/components/ui";

/*
 * Public usage page (traction proof). Real usage only: the demo business (DEMO_WIDGET_ID) and every id in
 * STATS_EXCLUDE_BUSINESSES (comma list: our own test accounts) are left out of every number.
 * Deviations from the dashboard-design house style: the project's own tokens and type scale win (teal accent,
 * sienna for chats handed to a person), light theme only like the rest of the site.
 */

export const metadata: Metadata = {
  title: "Live usage",
  description: "Real BizzAssist usage, updated live: businesses, people, chats and languages.",
};
export const dynamic = "force-dynamic"; // read the database on every request, never at build time

const AI = "var(--primary)";
const HUMAN = "var(--sienna)";
const NIL = "00000000-0000-0000-0000-000000000000"; // keeps the exclusion array non-empty

type Day = { day: string; total: number; ai: number };
type Totals = {
  businesses: number; businesses_new: number; businesses_prev: number;
  people: number; people_prev: number;
  chats: number; chats_prev: number; ai: number; ai_prev: number;
  learned: number;
};

const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const fmt = (n: number) => n.toLocaleString("en-US");

async function excludedBusinesses(): Promise<string[]> {
  const ids = (process.env.STATS_EXCLUDE_BUSINESSES ?? "").split(",").map((s) => s.trim()).filter((s) => /^[0-9a-f-]{36}$/i.test(s));
  const demo = process.env.DEMO_WIDGET_ID;
  if (demo && /^[0-9a-f-]{36}$/i.test(demo)) {
    const [w] = await sql<{ business_id: string }[]>`select business_id from widgets where id = ${demo}`;
    if (w) ids.push(w.business_id);
  }
  return [NIL, ...ids];
}

// shortcut: one query per request with no caching; add a short revalidate if this page ever gets real load.
export default async function StatsPage() {
  const ex = await excludedBusinesses();

  const [[t], days, langs] = await Promise.all([
    sql<Totals[]>`
      with real_c as (
        select c.* from conversations c
        where not (c.business_id = any(${ex}))
          and exists (select 1 from messages m where m.conversation_id = c.id and m.sender_role = 'buyer')
      ), acts as (
        select coalesce(m.sender_nx_id, c.guest_nx_id) as who, m.created_at
        from messages m join conversations c on c.id = m.conversation_id
        where not (c.business_id = any(${ex})) and m.sender_role in ('buyer', 'agent')
          and m.created_at >= now() - interval '60 days'
      )
      select
        (select count(*)::int from businesses where not (id = any(${ex}))) as businesses,
        (select count(*)::int from businesses where not (id = any(${ex})) and created_at >= now() - interval '30 days') as businesses_new,
        (select count(*)::int from businesses where not (id = any(${ex})) and created_at >= now() - interval '60 days' and created_at < now() - interval '30 days') as businesses_prev,
        (select count(distinct who)::int from acts where created_at >= now() - interval '30 days') as people,
        (select count(distinct who)::int from acts where created_at < now() - interval '30 days') as people_prev,
        (select count(*)::int from real_c where created_at >= now() - interval '30 days') as chats,
        (select count(*)::int from real_c where created_at >= now() - interval '60 days' and created_at < now() - interval '30 days') as chats_prev,
        (select count(*)::int from real_c where created_at >= now() - interval '30 days' and waiting_since is null) as ai,
        (select count(*)::int from real_c where created_at >= now() - interval '60 days' and created_at < now() - interval '30 days' and waiting_since is null) as ai_prev,
        (select count(*)::int from knowledge_items where not (business_id = any(${ex})) and source = 'learned') as learned
    `,
    sql<Day[]>`
      with days as (
        select generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') as day
      ), handled as (
        select date_trunc('day', c.created_at) as day, c.waiting_since is null as by_ai
        from conversations c
        where not (c.business_id = any(${ex})) and c.created_at >= date_trunc('day', now()) - interval '29 days'
          and exists (select 1 from messages m where m.conversation_id = c.id and m.sender_role = 'buyer')
      )
      select to_char(d.day, 'YYYY-MM-DD') as day, count(h.day)::int as total, (count(h.day) filter (where h.by_ai))::int as ai
      from days d left join handled h on h.day = d.day
      group by d.day order by d.day
    `,
    sql<{ lang: string; n: number }[]>`
      select lower(split_part(c.buyer_lang, '-', 1)) as lang, count(*)::int as n
      from conversations c
      where not (c.business_id = any(${ex})) and c.created_at >= now() - interval '30 days'
        and exists (select 1 from messages m where m.conversation_id = c.id and m.sender_role = 'buyer')
      group by 1 order by n desc, lang
    `,
  ]);

  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);
  const aiPct = pct(t.ai, t.chats);
  const aiPrev = pct(t.ai_prev, t.chats_prev);
  const langTotal = langs.reduce((s, l) => s + l.n, 0);
  const max = Math.max(1, ...days.map((d) => d.total));
  const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

  const kpis = [
    { label: "Businesses", tip: "Businesses signed up, excluding our own demo and test accounts", value: fmt(t.businesses), base: `+${fmt(t.businesses_new)} · 30 days` },
    { label: "Active people", tip: "Customers who sent a message plus team members who replied, last 30 days", value: fmt(t.people), base: `was ${fmt(t.people_prev)}` },
    { label: "Customer chats", tip: "Conversations where a customer wrote at least one message, last 30 days", value: fmt(t.chats), base: `was ${fmt(t.chats_prev)}` },
    { label: "Solved by AI", tip: "Chats the assistant finished without handing over to a person", value: aiPct == null ? "—" : `${aiPct}%`, base: aiPrev == null ? "—" : `was ${aiPrev}%` },
    { label: "Languages", tip: "Distinct languages customers wrote in, last 30 days", value: fmt(langs.length), base: "30 days" },
    { label: "Learned answers", tip: "Answers agents gave that owners approved, now used by the assistant", value: fmt(t.learned), base: "approved" },
  ];

  return (
    <main className="min-h-dvh bg-pearl">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8 sm:py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-ink" aria-label="BizzAssist home">
              <Mark size={22} />
              <span className="t-body-strong">BizzAssist</span>
            </Link>
            <span className="h-5 w-px bg-hairline" aria-hidden />
            <h1 className="t-body-strong text-ink">Live usage</h1>
          </div>
          <div className="t-caption flex items-center gap-2">
            <span className="rounded-full border border-hairline bg-canvas px-3 py-1 text-ink-80">Last 30 days</span>
            <span className="flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-3 py-1 text-ink-80" title="Numbers are read from the live database on every visit">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              Live · {now} UTC
            </span>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k, n) => (
            <Card key={k.label} className="p-5" title={k.tip}>
              <p className="t-caption text-ink-48">{k.label}</p>
              <p className={n === 2 ? "t-figure mt-3 text-primary" : "t-figure mt-3 text-ink"}>{k.value}</p>
              <p className="t-fine mt-1 tabular-nums text-ink-48">{k.base}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="t-body-strong">Customer chats per day</h2>
              <ul className="t-caption flex gap-4 text-ink-80" aria-label="Legend">
                <li className="flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ background: AI }} aria-hidden /> AI</li>
                <li className="flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ background: HUMAN }} aria-hidden /> Person</li>
              </ul>
            </div>
            {days.every((d) => d.total === 0) ? (
              <EmptyState line="No customer chats yet." />
            ) : (
              <>
                <div className="flex h-48 items-end gap-1 border-b border-hairline" role="list" aria-label="Chats per day">
                  {days.map((d) => {
                    const human = d.total - d.ai;
                    return (
                      <div key={d.day} role="listitem" tabIndex={0} aria-label={`${dayLabel(d.day)}: ${d.total} chats, ${d.ai} AI, ${human} person`} className="group relative flex h-full flex-1 flex-col justify-end outline-none">
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-sm bg-ink px-2 py-1 text-[12px] tabular-nums text-white group-hover:block group-focus-visible:block">
                          {dayLabel(d.day)} · {d.total} · {d.ai} AI · {human} person
                        </span>
                        {human > 0 && <div className="rounded-t-[3px]" style={{ height: `${(human / max) * 100}%`, background: HUMAN, marginBottom: d.ai ? 2 : 0 }} />}
                        {d.ai > 0 && <div className={human ? "" : "rounded-t-[3px]"} style={{ height: `${(d.ai / max) * 100}%`, background: AI }} />}
                      </div>
                    );
                  })}
                </div>
                <div className="t-fine mt-1.5 flex justify-between text-ink-48" aria-hidden>
                  <span>{dayLabel(days[0].day)}</span>
                  <span>Today</span>
                </div>
              </>
            )}
          </Card>

          <Card className="p-0">
            <h2 className="t-body-strong border-b border-divider px-6 py-4">Languages</h2>
            {langTotal === 0 ? (
              <EmptyState line="No customer chats yet." />
            ) : (
              <ul className="divide-y divide-divider">
                {langs.map((l) => (
                  <li key={l.lang} className="relative px-6 py-3">
                    <div className="t-caption flex justify-between gap-4">
                      <span className="text-ink-80">{langName(l.lang)}</span>
                      <span className="tabular-nums text-ink-48">
                        {fmt(l.n)} · {Math.round((l.n / langTotal) * 100)}%
                      </span>
                    </div>
                    <div className="absolute inset-x-6 bottom-0 h-[3px] rounded-full bg-divider" aria-hidden>
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(l.n / langTotal) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
