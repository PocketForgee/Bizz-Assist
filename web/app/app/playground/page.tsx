import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ButtonLink, Card, EmptyState, SubNav } from "@/components/ui";
import { Playground } from "./playground";

export const metadata: Metadata = { title: "Playground" };

export default async function PlaygroundPage() {
  const user = await requirePageUser({ owner: true });
  const widgets = await sql<{ id: string; name: string; color: string; title: string; greeting: string }[]>`
    select id, name, color, title, greeting from widgets where business_id = ${user.business_id} order by created_at
  `;
  if (!widgets.length) {
    return (
      <>
        <SubNav title="Playground" lead="Ask the assistant anything before your customers do" />
        <Card>
          <EmptyState line="Create a widget first, then test its bot here." action={<ButtonLink href="/app/widgets">Create a widget</ButtonLink>} />
        </Card>
      </>
    );
  }
  return <Playground widgets={widgets} />;
}
