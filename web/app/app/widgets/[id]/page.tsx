import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isUuid } from "@/lib/http";
import type { Widget } from "@/lib/widgets";
import { WidgetEditor } from "./editor";

export const metadata: Metadata = { title: "Widget editor" };

export default async function WidgetEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const user = await requirePageUser({ owner: true });
  const { id } = await params;
  const { tab } = await searchParams;
  if (!isUuid(id)) notFound();
  const [widget] = await sql<Widget[]>`select * from widgets where id = ${id} and business_id = ${user.business_id}`;
  if (!widget) notFound();
  const actions = await sql<{ id: string; name: string; description: string }[]>`
    select id, name, description from api_actions where business_id = ${user.business_id} order by created_at
  `;

  return (
    <WidgetEditor
      initial={JSON.parse(JSON.stringify(widget))}
      businessName={user.business_name}
      appUrl={(process.env.APP_URL ?? "").replace(/\/$/, "")}
      initialTab={tab === "install" || tab === "behaviour" ? tab : "appearance"}
      actions={[...actions]}
    />
  );
}
