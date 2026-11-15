import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { Card, EmptyState, SubNav } from "@/components/ui";

export const metadata: Metadata = { title: "Analytics" };

// Phase 3 fills this from ai_events.
export default async function AnalyticsPage() {
  await requirePageUser({ owner: true });
  return (
    <>
      <SubNav title="Analytics" />
      <Card>
        <EmptyState line="AI resolution, wait times and knowledge gaps show here once customers start chatting." />
      </Card>
    </>
  );
}
