import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { isUuid } from "@/lib/http";
import type { PublicWidget } from "@/lib/widgets";
import { BuyerChat } from "./buyer-chat";

type Props = { params: Promise<{ widgetId: string }>; searchParams: Promise<{ embed?: string }> };

async function load(widgetId: string): Promise<PublicWidget | null> {
  if (!isUuid(widgetId)) return null;
  const [w] = await sql<PublicWidget[]>`
    select w.id, w.name, w.type, w.color, w.title, w.greeting, coalesce(w.avatar, b.logo_url) as avatar, b.name as business_name
    from widgets w join businesses b on b.id = w.business_id where w.id = ${widgetId}
  `;
  return w ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const w = await load((await params).widgetId);
  return { title: w ? `Chat with ${w.business_name}` : "Chat", robots: { index: false } };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, interactiveWidget: "resizes-content" };

export default async function BuyerChatPage({ params, searchParams }: Props) {
  const [{ widgetId }, { embed }] = await Promise.all([params, searchParams]);
  const widget = await load(widgetId);
  if (!widget) notFound();
  return <BuyerChat widget={widget} embed={embed === "1"} />;
}
