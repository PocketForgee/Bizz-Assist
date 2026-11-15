import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, HttpError, json, readJson } from "@/lib/http";
import type { Plan } from "@/lib/plans";

const PLANS: Plan[] = ["free", "pro", "business"];

/**
 * Demo plan switch: no payment. Lets judges see higher limits right away.
 * Downgrading keeps existing items; limits only apply when something new is added.
 */
export const POST = handle(async (req: Request) => {
  const owner = await requireUser(req, { role: "owner" });
  const { plan } = await readJson(req);
  if (!PLANS.includes(plan as Plan)) throw new HttpError(400, "Pick Free, Pro or Business.", "plan");
  await sql`update businesses set plan = ${plan as Plan} where id = ${owner.business_id}`;
  return json({ plan });
});
