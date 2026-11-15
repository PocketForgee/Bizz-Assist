import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { AgentInbox } from "@/components/agent-inbox";
import { AgentBar } from "./agent-bar";

export const metadata: Metadata = { title: "Inbox" };

/** Agents land here. Full-height three-pane inbox under the global bar. */
export default async function AgentPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const user = await requirePageUser();
  const { c } = await searchParams;
  return (
    <div className="flex h-dvh flex-col">
      <AgentBar name={user.name} business={user.business_name} isOwner={user.role === "owner"} />
      <AgentInbox me={{ id: user.id, role: user.role }} initialConversation={c} className="min-h-0 flex-1" />
    </div>
  );
}
