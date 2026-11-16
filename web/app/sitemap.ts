import type { MetadataRoute } from "next";

const BASE = (process.env.APP_URL ?? "https://bizzassist.biz").replace(/\/$/, "");

// Public pages only; the dashboard and chats stay out.
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/signup"].map((path) => ({ url: `${BASE}${path}` }));
}
