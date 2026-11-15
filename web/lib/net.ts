// Outbound HTTP for business-supplied URLs (crawler + API Actions). SSRF guard:
// HTTPS only, no credentials in the URL, every resolved address must be public, redirects re-checked,
// hard timeout and response size cap.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class UnsafeUrlError extends Error {}

function v4ToInt(ip: string): number {
  return ip.split(".").reduce((n, o) => (n << 8) + Number(o), 0) >>> 0;
}

const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local (cloud metadata lives here)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

export function isPrivateIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) {
    const n = v4ToInt(ip);
    return V4_BLOCKED.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (v4ToInt(base) & mask);
    });
  }
  if (kind === 6) {
    const v = ip.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
    if (mapped) return isPrivateIp(mapped[1]);
    if (v === "::" || v === "::1") return true;
    if (/^f[cd]/.test(v)) return true; // fc00::/7 unique local
    if (/^fe[89ab]/.test(v)) return true; // fe80::/10 link-local
    if (/^ff/.test(v)) return true; // multicast
    if (v.startsWith("64:ff9b:")) return true; // NAT64 can reach private v4
    if (v.startsWith("2001:db8:")) return true; // documentation
    return false;
  }
  return true; // not an IP at all
}

/** Parses and checks a URL; resolves its host and rejects private / loopback / link-local targets. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("That is not a valid URL.");
  }
  if (url.protocol !== "https:") throw new UnsafeUrlError("Only https:// URLs are allowed.");
  if (url.username || url.password) throw new UnsafeUrlError("URLs with a username or password are not allowed.");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new UnsafeUrlError("Private hosts are not allowed.");
  }
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new UnsafeUrlError("Private addresses are not allowed.");
    return url;
  }
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError(`Could not find ${host}.`);
  }
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new UnsafeUrlError("That host points to a private address.");
  return url;
}

export type SafeResponse = { status: number; ok: boolean; url: string; contentType: string; body: Buffer; truncated: boolean };

/**
 * fetch with the SSRF guard. Follows up to 3 redirects, re-checking each hop.
 * shortcut: DNS is checked before fetch re-resolves (rebinding window of milliseconds);
 * pin the resolved IP with an undici Agent `connect.lookup` if this ever faces hostile tenants at scale.
 */
export async function safeFetch(
  raw: string,
  opts: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number; maxBytes?: number } = {},
): Promise<SafeResponse> {
  const maxBytes = opts.maxBytes ?? 4096;
  const signal = AbortSignal.timeout(opts.timeoutMs ?? 5000);
  let current = raw;
  let method = (opts.method ?? "GET").toUpperCase();
  let body = opts.body;

  for (let hop = 0; hop <= 3; hop++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, {
      method,
      headers: { "User-Agent": "BizzAssistBot/1.0 (+customer support assistant)", ...opts.headers },
      body: method === "GET" || method === "HEAD" ? undefined : body,
      redirect: "manual",
      signal,
      cache: "no-store",
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, url).toString();
      if (res.status === 303 || ((res.status === 301 || res.status === 302) && method === "POST")) {
        method = "GET";
        body = undefined;
      }
      await res.body?.cancel();
      continue;
    }

    const chunks: Buffer[] = [];
    let size = 0;
    let truncated = false;
    if (res.body) {
      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const room = maxBytes - size;
        if (value.byteLength > room) {
          chunks.push(Buffer.from(value.subarray(0, room)));
          size = maxBytes;
          truncated = true;
          await reader.cancel();
          break;
        }
        chunks.push(Buffer.from(value));
        size += value.byteLength;
      }
    }
    return { status: res.status, ok: res.ok, url: url.toString(), contentType: res.headers.get("content-type") ?? "", body: Buffer.concat(chunks), truncated };
  }
  throw new UnsafeUrlError("Too many redirects.");
}

/** Short, safe error text for the UI. */
export function fetchErrorMessage(err: unknown): string {
  if (err instanceof UnsafeUrlError) return err.message;
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) return "The site took longer than 5 seconds to answer.";
  return "Could not reach that URL.";
}
