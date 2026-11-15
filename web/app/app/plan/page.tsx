import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { PLAN_LABEL, PLAN_LIMITS, type Plan } from "@/lib/plans";
import { Card, Chip, SubNav, cn } from "@/components/ui";

export const metadata: Metadata = { title: "Plan" };

const ORDER: Plan[] = ["free", "pro", "business"];
const fmt = (n: number) => n.toLocaleString("en-US");

// Phase 1: shows limits. The demo upgrade switch comes in Phase 3.
export default async function PlanPage() {
  const user = await requirePageUser({ owner: true });
  return (
    <>
      <SubNav title="Plan" />
      <div className="grid gap-6 md:grid-cols-3">
        {ORDER.map((p) => {
          const l = PLAN_LIMITS[p];
          const current = p === user.plan;
          return (
            <Card key={p} className={cn("flex flex-col gap-4", current && "border-2 border-primary-focus")}>
              <div className="flex items-center justify-between">
                <h2 className="t-tagline">{PLAN_LABEL[p]}</h2>
                {current && <Chip tone="info">Current plan</Chip>}
              </div>
              <ul className="t-caption flex flex-col gap-2 text-ink-80">
                <li>{fmt(l.widgets)} widgets</li>
                <li>{fmt(l.aiReplies)} AI replies a month</li>
                <li>{fmt(l.qa)} Q&amp;A entries</li>
                <li>{fmt(l.pages)} website pages</li>
                <li>{fmt(l.actions)} API actions</li>
                <li>{fmt(l.agents)} agent seats</li>
              </ul>
            </Card>
          );
        })}
      </div>
    </>
  );
}
