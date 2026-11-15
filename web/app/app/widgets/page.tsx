import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { limitFor } from "@/lib/plans";
import type { Widget } from "@/lib/widgets";
import { Card, Chip, EmptyState, SubNav } from "@/components/ui";
import { NewWidgetButton } from "./new-widget-button";

export const metadata: Metadata = { title: "Widgets" };

export default async function WidgetsPage() {
  const user = await requirePageUser({ owner: true });
  const widgets = await sql<Pick<Widget, "id" | "name" | "type" | "color" | "title">[]>`
    select id, name, type, color, title from widgets where business_id = ${user.business_id} order by created_at
  `;
  const atLimit = widgets.length >= limitFor(user.plan, "widgets");

  return (
    <>
      <SubNav title="Widgets" action={<NewWidgetButton disabledReason={atLimit ? "Your plan's widget limit is reached. Upgrade on the Plan page." : undefined} />} />
      {widgets.length === 0 ? (
        <Card>
          <EmptyState line="A widget is the chat your customers see. Create one to get an install code." action={<NewWidgetButton />} />
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {widgets.map((w) => (
            <Card key={w.id} className="flex flex-col gap-4">
              <div className="flex h-24 items-end rounded-md p-3" style={{ background: w.color }}>
                <span className="rounded-pill bg-white/90 px-3 py-1 t-fine font-semibold text-ink">{w.title}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="t-body-strong truncate">{w.name}</p>
                <Chip>{w.type === "link" ? "Chat link" : "Website widget"}</Chip>
              </div>
              <Link href={`/app/widgets/${w.id}`} className="t-caption text-primary hover:underline">
                Open editor
              </Link>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
