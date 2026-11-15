import type { ReactNode } from "react";
import { requirePageUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { PLAN_LABEL } from "@/lib/plans";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requirePageUser();
  const [{ waiting, learned }] = await sql<{ waiting: number; learned: number }[]>`
    select
      (select count(*)::int from conversations where business_id = ${user.business_id} and status = 'waiting') as waiting,
      (select count(*)::int from learned_suggestions where business_id = ${user.business_id} and status = 'pending') as learned
  `;
  return (
    <AppShell user={user} planLabel={PLAN_LABEL[user.plan]} badges={{ "/app/inbox": waiting, "/app/train": learned }}>
      {children}
    </AppShell>
  );
}
