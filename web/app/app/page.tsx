import Link from "next/link";
import { Check } from "lucide-react";
import { requirePageUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Card, SubNav, ButtonLink, cn } from "@/components/ui";

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
      (select count(*)::int from conversations where business_id = ${user.business_id} and status = 'waiting') as waiting,
      (select count(*)::int from learned_suggestions where business_id = ${user.business_id} and status = 'pending') as learned,
      (select count(distinct conversation_id)::int from ai_events where business_id = ${user.business_id} and kind = 'answered' and created_at >= now() - interval '30 days') as answered,
      (select count(distinct conversation_id)::int from ai_events where business_id = ${user.business_id} and kind = 'escalated' and created_at >= now() - interval '30 days') as escalated
  `;

  const widgetHref = s.widget_id ? `/app/widgets/${s.widget_id}` : "/app/widgets";
  const steps = [
    { done: Boolean(s.widget_id), label: "Create your chat widget", href: widgetHref },
    { done: s.kb > 0, label: "Teach the bot with Q&A", href: "/app/train" },
    { done: s.domains > 0, label: "Install the chat on your site", href: `${widgetHref}?tab=install` },
    { done: s.convs > 0, label: "Have your first conversation", href: s.widget_id ? `/w/${s.widget_id}` : "/app/widgets" },
    { done: s.agents > 0, label: "Invite an agent", href: "/app/team" },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  const resolution = s.answered ? Math.round((Math.max(s.answered - s.escalated, 0) / s.answered) * 100) : null;
  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <>
      <SubNav title="Home" action={s.widget_id ? <ButtonLink href={`/w/${s.widget_id}`} target="_blank" className="min-h-9 px-4">Open chat</ButtonLink> : null} />
      {doneCount < steps.length && (
        <Card className="mb-6 flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex items-center gap-4 md:w-64">
            <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`${doneCount} of ${steps.length} steps done`}>
              <circle cx="32" cy="32" r={R} fill="none" stroke="var(--divider)" strokeWidth="6" />
              <circle cx="32" cy="32" r={R} fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - doneCount / steps.length)} transform="rotate(-90 32 32)" />
            </svg>
            <div>
              <p className="t-body-strong">Get set up</p>
              <p className="t-caption text-ink-48">
                {doneCount} of {steps.length} done
              </p>
            </div>
          </div>
          <ol className="flex-1 divide-y divide-divider">
            {steps.map((st) => (
              <li key={st.label} className="flex min-h-12 items-center gap-3">
                <span className={cn("flex size-6 items-center justify-center rounded-full border", st.done ? "border-success bg-success text-white" : "border-hairline")}>
                  {st.done && <Check size={14} aria-hidden />}
                </span>
                <span className={cn("t-caption flex-1", st.done && "text-ink-48 line-through")}>{st.label}</span>
                {!st.done && (
                  <Link href={st.href} className="t-caption text-primary hover:underline">
                    Do it
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <Kpi label="Conversations today" value={String(s.today)} />
        <Kpi label="AI resolution, 30 days" value={resolution === null ? "–" : `${resolution}%`} />
        <Kpi label="Waiting now" value={String(s.waiting)} href="/app/inbox" />
        <Kpi label="Learned answers to review" value={String(s.learned)} href="/app/train" />
      </div>
    </>
  );
}

function Kpi({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <Card className="h-full">
      <p className="t-display tabular-nums">{value}</p>
      <p className="t-caption mt-1 text-ink-48">{label}</p>
    </Card>
  );
  return href ? (
    <Link href={href} className="press block rounded-lg">
      {body}
    </Link>
  ) : (
    body
  );
}
