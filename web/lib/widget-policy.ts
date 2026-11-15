import { sql } from "./db";
import { frameAncestors } from "./widgets";

// Cached CSP per widget for proxy.ts, so every buyer page load doesn't hit the DB.
// shortcut: per-process cache, edits on another instance show after TTL; fine for one web container.
const TTL_MS = 60_000;
const cache = new Map<string, { csp: string | null; at: number }>();

/** CSP frame-ancestors for the widget, or null when the widget does not exist. */
export async function widgetFramePolicy(widgetId: string): Promise<string | null> {
  const hit = cache.get(widgetId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.csp;
  const [row] = await sql<{ allowed_domains: string[] }[]>`select allowed_domains from widgets where id = ${widgetId}`;
  const csp = row ? frameAncestors(row.allowed_domains) : null;
  cache.set(widgetId, { csp, at: Date.now() });
  if (cache.size > 5000) cache.clear();
  return csp;
}

export function forgetWidgetPolicy(widgetId: string) {
  cache.delete(widgetId);
}
