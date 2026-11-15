import { sql } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, HttpError, json, readJson, str } from "@/lib/http";
import { parseWidgetPatch } from "@/lib/widgets";

// Step 1: business profile. Step 2: first widget. Step 3: install (client only, nothing to save).
export const POST = handle(async (req: Request) => {
  const user = await requireUser(req, { role: "owner" });
  const body = await readJson(req);

  const category = str(body, "category", { max: 60, optional: true }) || null;
  let website = str(body, "website", { max: 300, optional: true }) || null;
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  if (website) {
    try {
      new URL(website);
    } catch {
      throw new HttpError(400, "Enter a valid website address.", "website");
    }
  }
  const defaultLang = str(body, "defaultLang", { max: 10, optional: true }) || "en";
  const supportHours = str(body, "supportHours", { max: 120, optional: true }) || null;
  const widgetBody = body.widget && typeof body.widget === "object" ? (body.widget as Record<string, unknown>) : {};
  const w = parseWidgetPatch(widgetBody);

  const widgetId = await sql.begin(async (tx) => {
    await tx`
      update businesses
      set category = ${category}, website = ${website}, default_lang = ${defaultLang},
          support_hours = ${supportHours}, onboarded_at = coalesce(onboarded_at, now())
      where id = ${user.business_id}
    `;
    const [existing] = await tx<{ id: string }[]>`
      select id from widgets where business_id = ${user.business_id} order by created_at limit 1
    `;
    if (existing) return existing.id;
    const [created] = await tx<{ id: string }[]>`
      insert into widgets (business_id, name, color, title, greeting, languages)
      values (${user.business_id}, ${w.name ?? "Website chat"}, ${w.color ?? "#0066cc"},
              ${w.title ?? user.business_name}, ${w.greeting ?? "Hi! How can we help you today?"}, ${[defaultLang]})
      returning id
    `;
    return created.id;
  });

  return json({ ok: true, widgetId, next: `/app/widgets/${widgetId}?tab=install` });
});
