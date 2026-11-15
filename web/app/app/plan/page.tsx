import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { PLAN_LABEL, PLAN_LIMITS, type Plan } from "@/lib/plans";
import { Card, Chip, SubNav, cn } from "@/components/ui";
import { PlanSwitch } from "./switch";

export const metadata: Metadata = { title: "Plan" };

const ORDER: Plan[] = ["free", "pro", "business"];
const fmt = (n: number) => n.toLocaleString("en-US");

export default async function PlanPage() {
  const user = await requirePageUser({ owner: true });
  const currentIdx = ORDER.indexOf(user.plan);
  return (
    <>
      <SubNav title="Plan" />
      <p className="t-caption mb-6 flex items-center gap-2 text-ink-48">
        <Chip tone="warning">Demo</Chip> Plan changes apply at once and nothing is charged.
      </p>
      <div className="grid gap-6 md:grid-cols-3">
        {ORDER.map((p, i) => {
          const l = PLAN_LIMITS[p];
          const current = p === user.plan;
          return (
            <Card key={p} className={cn("flex flex-col gap-4", current && "border-2 border-primary-focus")}>
              <div className="flex items-center justify-between">
                <h2 className="t-tagline">{PLAN_LABEL[p]}</h2>
                {current && <Chip tone="info">Current plan</Chip>}
              </div>
              <p>
                <span className="t-display tabular-nums">{fmt(l.aiReplies)}</span>
                <span className="t-caption text-ink-48"> AI replies a month</span>
              </p>
              <ul className="t-caption flex flex-col gap-2 text-ink-80">
                <li>{fmt(l.widgets)} widgets</li>
                <li>{fmt(l.qa)} Q&amp;A entries</li>
                <li>{fmt(l.pages)} website pages</li>
                <li>{fmt(l.actions)} API actions</li>
                <li>{fmt(l.agents)} agent seats</li>
              </ul>
              {!current && <PlanSwitch plan={p} label={PLAN_LABEL[p]} up={i > currentIdx} />}
            </Card>
          );
        })}
      </div>
    </>
  );
}
