import { requireUser } from "@/lib/auth";
import { handle, HttpError, json, rateLimit, readJson, str, strList } from "@/lib/http";
import { addPages, normalizePageUrl, sitemapUrls } from "@/lib/ingest/web";
import { assertPublicUrl, fetchErrorMessage } from "@/lib/net";
import { limitFor } from "@/lib/plans";

/** { urls: string | string[] } or { sitemap: "https://shop.com/sitemap.xml" } */
export const POST = handle(async (req: Request) => {
  const user = await requireUser(req, { role: "owner" });
  rateLimit(req, "kb-web", 20, 60_000);
  const body = await readJson(req);

  let urls: string[] = [];
  if (typeof body.sitemap === "string" && body.sitemap.trim()) {
    const sm = normalizePageUrl(str(body, "sitemap", { max: 500 }));
    if (!sm) throw new HttpError(400, "Enter a valid sitemap URL.", "sitemap");
    try {
      await assertPublicUrl(sm);
    } catch (err) {
      throw new HttpError(400, fetchErrorMessage(err), "sitemap");
    }
    urls = await sitemapUrls(sm, limitFor(user.plan, "pages"));
    if (!urls.length) throw new HttpError(400, "No pages found in that sitemap.", "sitemap");
  } else {
    const raw = strList(body, "urls", { maxItems: 200, maxLen: 500 });
    if (!raw.length) throw new HttpError(400, "Add at least one page URL.", "urls");
    const bad = raw.find((u) => !normalizePageUrl(u));
    if (bad) throw new HttpError(400, `"${bad}" is not a valid URL.`, "urls");
    urls = raw;
  }

  const { added, skipped } = await addPages(user.business_id, user.plan, urls);
  if (!added) throw new HttpError(402, `Your plan includes ${limitFor(user.plan, "pages")} website pages. Remove some or upgrade.`);
  return json({ ok: true, added, skipped }, 201);
});
