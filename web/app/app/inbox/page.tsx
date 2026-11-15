import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { AgentInbox } from "@/components/agent-inbox";
import { SubNav } from "@/components/ui";

export const metadata: Metadata = { title: "Inbox" };

/** Owner inbox inside the dashboard. The owner is also an agent: same three-pane view as /agent. */
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const user = await requirePageUser();
  const { c } = await searchParams;
  return (
    <>
      <SubNav
        title="Inbox"
        action={
          <Link href={c ? `/agent?c=${c}` : "/agent"} className="t-caption text-primary hover:underline">
            Open full screen
          </Link>
        }
      />
      <AgentInbox me={{ id: user.id, role: user.role }} initialConversation={c} className="h-[calc(100dvh-44px-52px-48px)] overflow-hidden rounded-lg border border-hairline" />
    </>
  );
}
