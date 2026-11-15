import { NextResponse } from "next/server";

/** Thrown anywhere in a route handler; `handle()` turns it into a JSON error response. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

export const json = (data: unknown, init?: number | ResponseInit) =>
  NextResponse.json(data, typeof init === "number" ? { status: init } : init);

/** Wraps a route handler: HttpError -> its status, anything else -> 500 without leaking internals. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return json({ error: err.message, field: err.field }, err.status);
      }
      console.error("[api] unhandled", err);
      return json({ error: "Something went wrong. Try again." }, 500);
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  throw new HttpError(400, "Request body must be a JSON object.");
}

// ---- small validators for trust-boundary input ----

export function str(body: Record<string, unknown>, key: string, opts: { min?: number; max?: number; optional?: boolean; label?: string } = {}): string {
  const label = opts.label ?? key;
  const raw = body[key];
  if (raw === undefined || raw === null || raw === "") {
    if (opts.optional) return "";
    throw new HttpError(400, `Enter ${label}.`, key);
  }
  if (typeof raw !== "string") throw new HttpError(400, `${label} must be text.`, key);
  const v = raw.trim();
  if (opts.min && v.length < opts.min) throw new HttpError(400, `${label} needs at least ${opts.min} characters.`, key);
  if (opts.max && v.length > opts.max) throw new HttpError(400, `${label} can be at most ${opts.max} characters.`, key);
  return v;
}

export function strList(body: Record<string, unknown>, key: string, opts: { maxItems?: number; maxLen?: number } = {}): string[] {
  const raw = body[key];
  if (raw === undefined || raw === null) return [];
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[\n,]/) : null;
  if (!list) throw new HttpError(400, `${key} must be a list.`, key);
  const clean = list
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
  if (clean.length > (opts.maxItems ?? 50)) throw new HttpError(400, `${key} has too many entries.`, key);
  if (clean.some((x) => x.length > (opts.maxLen ?? 200))) throw new HttpError(400, `An entry in ${key} is too long.`, key);
  return [...new Set(clean)];
}

export const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export function requireUuid(v: unknown, what = "id"): string {
  if (!isUuid(v)) throw new HttpError(404, `Unknown ${what}.`);
  return v;
}

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// ---- per-IP rate limit (in memory) ----
// shortcut: in-process fixed window, move to Redis when running more than one web instance.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimit(req: Request, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const id = `${key}:${clientIp(req)}`;
  const b = buckets.get(id);
  if (!b || b.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return;
  }
  b.count += 1;
  if (b.count > limit) throw new HttpError(429, "Too many requests. Wait a minute and try again.");
}
