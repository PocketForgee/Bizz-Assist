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
        lead="Chats the assistant handed to a person"
        action={
          <Link href={c ? `/agent?c=${c}` : "/agent"} className="press inline-flex min-h-9 items-center rounded-md px-3 text-[14px] text-ink-80 hover:bg-parchment hover:text-ink">
            Open full screen
          </Link>
        }
      />
      <AgentInbox me={{ id: user.id, role: user.role }} initialConversation={c} className="h-[calc(100dvh-64px-32px-24px)] overflow-hidden rounded-lg border border-hairline shadow-[0_1px_2px_rgb(38_70_83/0.04)] max-[899px]:h-[calc(100dvh-56px-64px-32px-24px)]" />
    </>
  );
}
