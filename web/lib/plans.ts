import { HttpError } from "./http";

export type Plan = "free" | "pro" | "business";
export type Limited = "widgets" | "pages" | "qa" | "actions" | "agents" | "aiReplies";

export const PLAN_LIMITS: Record<Plan, Record<Limited, number>> = {
  free: { widgets: 1, pages: 20, qa: 50, actions: 1, agents: 1, aiReplies: 300 },
  pro: { widgets: 5, pages: 300, qa: 1000, actions: 10, agents: 5, aiReplies: 5000 },
  business: { widgets: 25, pages: 3000, qa: 10000, actions: 50, agents: 50, aiReplies: 50000 },
};

export const PLAN_LABEL: Record<Plan, string> = { free: "Free", pro: "Pro", business: "Business" };

const NOUN: Record<Limited, string> = {
  widgets: "widgets",
  pages: "website pages",
  qa: "Q&A entries",
  actions: "API actions",
  agents: "agents",
  aiReplies: "AI replies this month",
};

export function limitFor(plan: Plan, what: Limited): number {
  return PLAN_LIMITS[plan]?.[what] ?? PLAN_LIMITS.free[what];
}

/** True when one more item fits. `used` = how many exist now. */
export function withinLimit(plan: Plan, what: Limited, used: number, adding = 1): boolean {
  return used + adding <= limitFor(plan, what);
}

/** Throws 402 when adding would pass the plan limit. Call on create and before each AI reply. */
export function assertLimit(plan: Plan, what: Limited, used: number, adding = 1): void {
  if (!withinLimit(plan, what, used, adding)) {
    throw new HttpError(402, `Your ${PLAN_LABEL[plan]} plan includes ${limitFor(plan, what)} ${NOUN[what]}. Upgrade to add more.`);
  }
}
