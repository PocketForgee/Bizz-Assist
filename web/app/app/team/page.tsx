import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { limitFor } from "@/lib/plans";
import { Card, Chip, SubNav } from "@/components/ui";

export const metadata: Metadata = { title: "Team" };

// Phase 1: member list. "Add agent" (temporary password sheet) arrives with the agent inbox in Phase 2.
export default async function TeamPage() {
  const user = await requirePageUser({ owner: true });
  const members = await sql<{ id: string; name: string; email: string; role: "owner" | "agent"; lang: string }[]>`
    select id, name, email, role, lang from users where business_id = ${user.business_id} order by role desc, created_at
  `;
  const agents = members.filter((m) => m.role === "agent").length;

  return (
    <>
      <SubNav title="Team" />
      <Card className="p-0">
        <div className="border-b border-divider px-6 py-4">
          <h2 className="t-body-strong">Members</h2>
          <p className="t-caption text-ink-48">
            {agents} of {limitFor(user.plan, "agents")} agent seats used.
          </p>
        </div>
        <ul className="divide-y divide-divider">
          {members.map((m) => (
            <li key={m.id} className="flex min-h-14 items-center gap-4 px-6 py-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-parchment t-caption-strong" aria-hidden>
                {m.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="t-caption-strong truncate">
                  {m.name}
                  {m.id === user.id && <span className="font-normal text-ink-48"> (you)</span>}
                </p>
                <p className="t-fine truncate text-ink-48">{m.email}</p>
              </div>
              <Chip className="uppercase">{m.lang}</Chip>
              <Chip tone={m.role === "owner" ? "info" : "neutral"}>{m.role === "owner" ? "Owner" : "Agent"}</Chip>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
