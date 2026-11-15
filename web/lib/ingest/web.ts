// Website training: fetch pages through the SSRF guard, keep only the readable text.
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { sql } from "../db";
import { enqueue } from "../queue";
import { fetchErrorMessage, safeFetch } from "../net";
import { limitFor, type Plan } from "../plans";

const PAGE_BYTES = 2 * 1024 * 1024;
const PAGE_CHARS = 30_000; // per page, before it joins the prompt budget
const MIN_USEFUL_CHARS = 120;

export const clean = (s: string) =>
  s
    .replace(/\r/g, "")
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** Readable title + text of an HTML page. Falls back to the whole body when Readability finds no article. */
export function extractPage(html: string, url: string): { title: string; text: string } {
  const { document } = parseHTML(html);
  for (const el of document.querySelectorAll("script, style, noscript, svg, iframe, template")) el.remove();
  const pageTitle = (document.querySelector("title")?.textContent ?? "").trim();
  let text = "";
  let title = pageTitle;
  try {
    // linkedom's document is close enough for Readability; it wants a baseURI for relative links
    Object.defineProperty(document, "baseURI", { value: url, configurable: true });
    const article = new Readability(document as unknown as Document, { charThreshold: 200 }).parse();
    if (article?.textContent) {
      text = article.textContent;
      title = (article.title || pageTitle).trim();
    }
  } catch {
    /* fall back below */
  }
  if (clean(text).length < MIN_USEFUL_CHARS) text = document.body?.textContent ?? text;
  return { title: title.slice(0, 200) || new URL(url).pathname, text: clean(text).slice(0, PAGE_CHARS) };
}

/** <loc> URLs from a sitemap or sitemap index. */
export function parseSitemap(xml: string): { urls: string[]; isIndex: boolean } {
  const urls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, "&"));
  return { urls, isIndex: /<sitemapindex[\s>]/i.test(xml) };
}

export function normalizePageUrl(raw: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
    if (u.protocol === "http:") u.protocol = "https:";
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

/** Fetches a sitemap (following one level of index) and returns same-host page URLs. */
export async function sitemapUrls(sitemapUrl: string, max: number): Promise<string[]> {
  const host = new URL(sitemapUrl).host;
  const out = new Set<string>();
  const queue = [sitemapUrl];
  let fetched = 0;
  while (queue.length && out.size < max && fetched < 4) {
    const next = queue.shift()!;
    fetched++;
    try {
      const res = await safeFetch(next, { maxBytes: PAGE_BYTES, timeoutMs: 5000 });
      if (!res.ok) continue;
      const { urls, isIndex } = parseSitemap(res.body.toString("utf8"));
      for (const u of urls) {
        const n = normalizePageUrl(u);
        if (!n || new URL(n).host !== host) continue;
        if (isIndex) queue.push(n);
        else out.add(n);
        if (out.size >= max) break;
      }
    } catch {
      /* skip unreachable sitemap */
    }
  }
  return [...out].slice(0, max);
}

async function fetchPage(url: string): Promise<{ title: string; text: string }> {
  const res = await safeFetch(url, { maxBytes: PAGE_BYTES, timeoutMs: 5000, headers: { Accept: "text/html,application/xhtml+xml" } });
  if (!res.ok) throw new Error(`The page returned HTTP ${res.status}.`);
  if (!/html|xml|text\/plain/i.test(res.contentType)) throw new Error("That URL is not a web page.");
  const body = res.body.toString("utf8");
  return /text\/plain/i.test(res.contentType) ? { title: new URL(res.url).pathname, text: clean(body).slice(0, PAGE_CHARS) } : extractPage(body, res.url);
}

async function pagesUsed(businessId: string): Promise<number> {
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from knowledge_items where business_id = ${businessId} and source = 'web'`;
  return n;
}

/** Fetches one stored page and marks it ready or error. */
export async function syncPage(itemId: string): Promise<void> {
  const [item] = await sql<{ id: string; url: string }[]>`
    update knowledge_items set status = 'syncing', error = null where id = ${itemId} and source = 'web' returning id, url
  `;
  if (!item) return;
  try {
    const page = await fetchPage(item.url);
    if (page.text.length < MIN_USEFUL_CHARS) throw new Error("No readable text on that page.");
    await sql`update knowledge_items set title = ${page.title}, content = ${page.text}, status = 'ready', error = null, updated_at = now() where id = ${item.id}`;
  } catch (err) {
    const msg = err instanceof Error && err.message.startsWith("The page") ? err.message : err instanceof Error && /readable|web page/.test(err.message) ? err.message : fetchErrorMessage(err);
    await sql`update knowledge_items set status = 'error', error = ${msg}, updated_at = now() where id = ${item.id}`;
  }
}

export function queueSync(businessId: string, itemIds: string[]) {
  for (const id of itemIds) void enqueue(`crawl:${businessId}`, () => syncPage(id));
}

/**
 * Adds page URLs (re-adding an existing URL re-syncs it) and queues the fetches.
 * Returns how many were accepted; the rest were over the plan's page limit.
 */
export async function addPages(businessId: string, plan: Plan, urls: string[]): Promise<{ added: number; skipped: number }> {
  const unique = [...new Set(urls.map(normalizePageUrl).filter((u): u is string => Boolean(u)))];
  const existing = new Set(
    (await sql<{ url: string }[]>`select url from knowledge_items where business_id = ${businessId} and source = 'web' and url = any(${unique})`).map((r) => r.url),
  );
  const room = Math.max(0, limitFor(plan, "pages") - (await pagesUsed(businessId)));
  const fresh = unique.filter((u) => !existing.has(u)).slice(0, room);
  const accepted = [...unique.filter((u) => existing.has(u)), ...fresh];
  const ids: string[] = [];
  for (const url of accepted) {
    const [row] = await sql<{ id: string }[]>`
      insert into knowledge_items (business_id, source, url, title, status)
      values (${businessId}, 'web', ${url}, ${new URL(url).pathname}, 'pending')
      on conflict (business_id, url) where source = 'web' do update set status = 'pending', error = null
      returning id
    `;
    ids.push(row.id);
  }
  queueSync(businessId, ids);
  return { added: accepted.length, skipped: unique.length - accepted.length };
}

const COMMON_PATHS = [
  "/",
  "/faq",
  "/faqs",
  "/pages/faq",
  "/refund-policy",
  "/return-policy",
  "/shipping",
  "/shipping-policy",
  "/terms",
  "/contact",
  "/pages/contact",
  "/policies/refund-policy",
  "/policies/shipping-policy",
  "/policies/terms-of-service",
  "/policies/privacy-policy",
];

/**
 * Onboarding auto-crawl: homepage, common policy paths and the top sitemap URLs.
 * Probes candidates first and stores only pages that answered with readable text, so 404s don't clutter the list.
 */
export async function autoCrawl(businessId: string, plan: Plan, website: string): Promise<void> {
  const base = normalizePageUrl(website);
  if (!base) return;
  const origin = new URL(base).origin;
  const budget = Math.min(25, Math.max(0, limitFor(plan, "pages") - (await pagesUsed(businessId))));
  if (!budget) return;
  const candidates = new Set(COMMON_PATHS.map((p) => origin + p));
  for (const u of await sitemapUrls(`${origin}/sitemap.xml`, 10)) candidates.add(u);

  let stored = 0;
  for (const url of candidates) {
    if (stored >= budget) break;
    try {
      const page = await fetchPage(url);
      if (page.text.length < MIN_USEFUL_CHARS) continue;
      await sql`
        insert into knowledge_items (business_id, source, url, title, content, status)
        values (${businessId}, 'web', ${url}, ${page.title}, ${page.text}, 'ready')
        on conflict (business_id, url) where source = 'web' do update
          set title = excluded.title, content = excluded.content, status = 'ready', error = null, updated_at = now()
      `;
      stored++;
    } catch {
      /* missing page: skip */
    }
  }
}
