import { HEX_COLOR, HttpError, str, strList } from "./http";

export type Widget = {
  id: string;
  business_id: string;
  name: string;
  type: "widget" | "link";
  color: string;
  title: string;
  greeting: string;
  avatar: string | null;
  languages: string[];
  persona: string;
  allowed_domains: string[];
  enabled_action_ids: string[];
  escalation_keywords: string[];
  created_at: Date;
  updated_at: Date;
};

/** What the public buyer page may see. */
export type PublicWidget = Pick<Widget, "id" | "name" | "type" | "color" | "title" | "greeting" | "avatar"> & { business_name: string };

export type WidgetPatch = Partial<
  Pick<Widget, "name" | "type" | "color" | "title" | "greeting" | "avatar" | "languages" | "persona" | "allowed_domains" | "escalation_keywords">
>;

/** "https://Shop.example.com/path" -> "shop.example.com"; "*.example.com" stays a wildcard. */
export function normalizeDomain(raw: string): string | null {
  let v = raw.trim().toLowerCase();
  if (!v) return null;
  v = v.replace(/^[a-z]+:\/\//, "").replace(/\/.*$/, "");
  return /^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)*(:\d{1,5})?$/.test(v) ? v : null;
}

/** Validates a widget create/update body. Only keys present in the body are returned. */
export function parseWidgetPatch(body: Record<string, unknown>): WidgetPatch {
  const p: WidgetPatch = {};
  if ("name" in body) p.name = str(body, "name", { max: 60, label: "a widget name" });
  if ("type" in body) {
    if (body.type !== "widget" && body.type !== "link") throw new HttpError(400, "Type must be widget or link.", "type");
    p.type = body.type;
  }
  if ("color" in body) {
    const c = str(body, "color", { label: "a colour" });
    if (!HEX_COLOR.test(c)) throw new HttpError(400, "Colour must look like #0066cc.", "color");
    p.color = c.toLowerCase();
  }
  if ("title" in body) p.title = str(body, "title", { max: 60, label: "a title" });
  if ("greeting" in body) p.greeting = str(body, "greeting", { max: 300, label: "a greeting" });
  if ("avatar" in body) {
    const a = str(body, "avatar", { max: 500, optional: true });
    if (a && !/^https:\/\//.test(a)) throw new HttpError(400, "Avatar must be an https:// image URL.", "avatar");
    p.avatar = a || null;
  }
  if ("languages" in body) p.languages = strList(body, "languages", { maxItems: 20, maxLen: 10 });
  if ("persona" in body) p.persona = str(body, "persona", { max: 1000, optional: true });
  if ("allowed_domains" in body) {
    const list = strList(body, "allowed_domains", { maxItems: 20, maxLen: 255 });
    const domains = list.map(normalizeDomain);
    const bad = list.find((_, i) => !domains[i]);
    if (bad) throw new HttpError(400, `"${bad}" is not a valid domain.`, "allowed_domains");
    p.allowed_domains = [...new Set(domains as string[])];
  }
  if ("escalation_keywords" in body) p.escalation_keywords = strList(body, "escalation_keywords", { maxItems: 30, maxLen: 40 }).map((k) => k.toLowerCase());
  return p;
}

/** CSP frame-ancestors value for the buyer page. No domains = the widget can be embedded anywhere. */
export function frameAncestors(domains: string[]): string {
  if (!domains.length) return "frame-ancestors *";
  const sources = domains.flatMap((d) => [`https://${d}`, ...(d.startsWith("localhost") || d.startsWith("127.0.0.1") ? [`http://${d}`] : [])]);
  return `frame-ancestors 'self' ${sources.join(" ")}`;
}
