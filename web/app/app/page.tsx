import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { requirePageUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { SubNav, ButtonLink, cn } from "@/components/ui";

export default async function HomePage() {
  const user = await requirePageUser({ owner: true });
  const [s] = await sql<
    {
      widget_id: string | null;
      kb: number;
      domains: number;
      convs: number;
      agents: number;
      today: number;
      yesterday: number;
      waiting: number;
      learned: number;
      answered: number;
      escalated: number;
    }[]
  >`
    select
      (select id from widgets where business_id = ${user.business_id} order by created_at limit 1) as widget_id,
      (select count(*)::int from knowledge_items where business_id = ${user.business_id}) as kb,
      (select count(*)::int from widgets where business_id = ${user.business_id} and cardinality(allowed_domains) > 0) as domains,
      (select count(*)::int from conversations where business_id = ${user.business_id}) as convs,
      (select count(*)::int from users where business_id = ${user.business_id} and role = 'agent') as agents,
      (select count(*)::int from conversations where business_id = ${user.business_id} and created_at >= date_trunc('day', now())) as today,
      (select count(*)::int from conversations where business_id = ${user.business_id} and created_at >= date_trunc('day', now()) - interval '1 day' and created_at < date_trunc('day', now())) as yesterday,
      (select count(*)::int from conversations where business_id = ${user.business_id} and status = 'waiting') as waiting,
      (select count(*)::int from learned_suggestions where business_id = ${user.business_id} and status = 'pending') as learned,
      (select count(distinct conversation_id)::int from ai_events where business_id = ${user.business_id} and kind = 'answered' and created_at >= now() - interval '30 days') as answered,
      (select count(distinct conversation_id)::int from ai_events where business_id = ${user.business_id} and kind = 'escalated' and created_at >= now() - interval '30 days') as escalated
  `;
  const [waitingRows, learnedRows] = await Promise.all([
    sql<{ id: string; issue: string | null; buyer_lang: string; waiting_since: string }[]>`
      select id, summary->>'issue' as issue, buyer_lang, waiting_since from conversations
      where business_id = ${user.business_id} and status = 'waiting' order by waiting_since limit 4
    `,
    sql<{ id: string; question: string; answer: string }[]>`
      select id, question, answer from learned_suggestions
      where business_id = ${user.business_id} and status = 'pending' order by created_at desc limit 3
    `,
  ]);

  const widgetHref = s.widget_id ? `/app/widgets/${s.widget_id}` : "/app/widgets";
  const steps = [
    { done: Boolean(s.widget_id), label: "Create your chat widget", href: widgetHref },
    { done: s.kb > 0, label: "Teach the assistant with a Q&A answer", href: "/app/train" },
    { done: s.domains > 0, label: "Put the chat on your site", href: `${widgetHref}?tab=install` },
    { done: s.convs > 0, label: "Have your first conversation", href: s.widget_id ? `/w/${s.widget_id}` : "/app/widgets" },
    { done: s.agents > 0, label: "Invite someone to answer chats", href: "/app/team" },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  const resolution = s.answered ? Math.round((Math.max(s.answered - s.escalated, 0) / s.answered) * 100) : null;
  const delta = s.today - s.yesterday;
  const now = Date.now();
  const mins = (iso: string) => Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));

  return (
    <>
      <SubNav
        title={user.business_name}
        lead={new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
        action={
          s.widget_id ? (
            <ButtonLink href={`/w/${s.widget_id}`} target="_blank" variant="secondary">
              Open your chat
            </ButtonLink>
          ) : null
        }
      />

      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Conversations today" value={String(s.today)} note={delta === 0 ? "Same as yesterday" : `${delta > 0 ? "+" : ""}${delta} vs yesterday`} />
        <Stat label="Solved by the assistant" value={resolution === null ? "–" : `${resolution}%`} note="Last 30 days" accent />
        <Stat label="Waiting for a person" value={String(s.waiting)} note={s.waiting ? "Open the inbox" : "No one waiting"} href="/app/inbox" warn={s.waiting > 0} />
        <Stat label="Answers to review" value={String(s.learned)} note="Learned from your team" href="/app/train?tab=learned" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Panel title="Waiting for a person" href="/app/inbox" more="Open inbox">
            {waitingRows.length === 0 ? (
              <p className="t-caption px-5 py-8 text-ink-48">No one is waiting. Chats the assistant hands over show up here and in the inbox.</p>
            ) : (
              <ul className="divide-y divide-divider">
                {waitingRows.map((r) => (
                  <li key={r.id}>
                    <Link href={`/app/inbox?c=${r.id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-pearl">
                      <span className="live-dot shrink-0 text-sand" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-[14px] text-ink" dir="auto">
                        {r.issue ?? "New conversation"}
                      </span>
                      <span className="t-mono uppercase text-ink-48">{r.buyer_lang}</span>
                      <span className="t-mono w-16 text-right text-warning">{mins(r.waiting_since)} min</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Learned from your team" href="/app/train?tab=learned" more="Review all">
            {learnedRows.length === 0 ? (
              <p className="t-caption px-5 py-8 text-ink-48">When someone on your team resolves a chat, the reusable answer appears here for you to approve.</p>
            ) : (
              <ul className="divide-y divide-divider">
                {learnedRows.map((r) => (
                  <li key={r.id} className="px-5 py-4">
                    <p className="text-[14px] font-medium text-ink" dir="auto">
                      {r.question}
                    </p>
                    <p className="t-caption mt-1 line-clamp-2 text-ink-80" dir="auto">
                      {r.answer}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {doneCount < steps.length ? (
          <Panel title="Get set up" aside={`${doneCount} of ${steps.length}`}>
            <div className="px-5 pt-1 pb-2">
              <div className="flex h-1.5 overflow-hidden rounded-full bg-parchment" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount}>
                <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
              </div>
            </div>
            <ol className="p-2">
              {steps.map((st, n) => (
                <li key={st.label}>
                  <Link href={st.href} className={cn("group flex h-12 items-center gap-3 rounded-md px-3 transition-colors", !st.done && "hover:bg-pearl")}>
                    <span
                      className={cn(
                        "t-mono flex size-6 shrink-0 items-center justify-center rounded-full border",
                        st.done ? "border-primary bg-primary text-white" : "border-hairline text-ink-48",
                      )}
                    >
                      {st.done ? <Check size={13} aria-hidden /> : n + 1}
                    </span>
                    <span className={cn("flex-1 text-[14px]", st.done ? "text-ink-48" : "text-ink")}>{st.label}</span>
                    {!st.done && <ArrowRight size={16} strokeWidth={1.5} className="text-ink-48 transition-transform group-hover:translate-x-0.5" aria-hidden />}
                  </Link>
                </li>
              ))}
            </ol>
          </Panel>
        ) : (
          <Panel title="Your assistant">
            <dl className="grid grid-cols-2 gap-px bg-divider">
              {[
                ["Things it knows", s.kb],
                ["Conversations", s.convs],
                ["People answering", s.agents + 1],
                ["Handed over, 30 days", s.escalated],
              ].map(([k, v]) => (
                <div key={k} className="bg-canvas px-5 py-4">
                  <dt className="t-caption text-ink-48">{k}</dt>
                  <dd className="mt-1 text-[22px] font-medium tabular-nums text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, note, href, accent, warn }: { label: string; value: string; note: string; href?: string; accent?: boolean; warn?: boolean }) {
  const body = (
    <div className={cn("h-full rounded-lg border border-hairline bg-canvas p-5 shadow-[0_1px_2px_rgb(38_70_83/0.04)]", href && "transition-[border-color,box-shadow] hover:border-[rgb(23_23_23/0.18)]")}>
      <p className="t-caption text-ink-48">{label}</p>
      <p className={cn("t-figure mt-3", accent ? "text-primary" : warn ? "text-warning" : "text-ink")}>{value}</p>
      <p className="t-fine mt-2 text-ink-48">{note}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="press block rounded-lg">
      {body}
    </Link>
  ) : (
    body
  );
}

function Panel({ title, href, more, aside, children }: { title: string; href?: string; more?: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-hairline bg-canvas shadow-[0_1px_2px_rgb(38_70_83/0.04)]">
      <header className="flex h-12 items-center justify-between border-b border-divider px-5">
        <h2 className="text-[15px] font-medium text-ink">{title}</h2>
        {href && more ? (
          <Link href={href} className="t-caption flex items-center gap-1 text-ink-48 hover:text-ink">
            {more} <ArrowRight size={14} strokeWidth={1.5} aria-hidden />
          </Link>
        ) : aside ? (
          <span className="t-mono text-ink-48">{aside}</span>
        ) : null}
      </header>
      {children}
    </section>
  );
}
