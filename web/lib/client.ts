"use client";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; field?: string; status: number };

/** fetch wrapper for our JSON API: never throws, returns the server's error message and field. */
export async function api<T = Record<string, unknown>>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
      headers: opts.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      credentials: "same-origin",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: typeof data.error === "string" ? data.error : "Something went wrong. Try again.",
        field: typeof data.field === "string" ? data.field : undefined,
      };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, status: 0, error: "No connection. Check your internet and try again." };
  }
}
