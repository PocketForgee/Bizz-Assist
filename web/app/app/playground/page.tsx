import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ButtonLink, Card, EmptyState, SubNav } from "@/components/ui";

export const metadata: Metadata = { title: "Playground" };

// Phase 1: points to the live chat. The sourced playground with "Fix this answer" is Phase 2.
export default async function PlaygroundPage() {
  const user = await requirePageUser({ owner: true });
  const [w] = await sql<{ id: string }[]>`select id from widgets where business_id = ${user.business_id} order by created_at limit 1`;
  return (
    <>
      <SubNav title="Playground" />
      <Card>
        <EmptyState
          line="Test the bot the way a customer sees it."
          action={w ? <ButtonLink href={`/w/${w.id}`} target="_blank">Open your chat</ButtonLink> : <ButtonLink href="/app/widgets">Create a widget</ButtonLink>}
        />
      </Card>
    </>
  );
}
