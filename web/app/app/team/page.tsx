import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { limitFor } from "@/lib/plans";
import { TeamList, type Member } from "./team-list";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const user = await requirePageUser({ owner: true });
  const members = await sql<Member[]>`
    select id, name, email, role, lang from users where business_id = ${user.business_id} order by role desc, created_at
  `;
  return <TeamList initial={[...members]} meId={user.id} seats={limitFor(user.plan, "agents")} />;
}
