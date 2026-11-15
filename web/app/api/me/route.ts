import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, HttpError, json, readJson } from "@/lib/http";
import { isLang } from "@/lib/langs";

export const GET = handle(async (req: Request) => json({ user: await requireUser(req) }));

/** The signed-in user's own settings. Today: `lang`, the language chats get translated into. */
export const PATCH = handle(async (req: Request) => {
  const user = await requireUser(req);
  const { lang } = await readJson(req);
  if (!isLang(lang)) throw new HttpError(400, "Pick a language from the list.", "lang");
  await sql`update users set lang = ${lang} where id = ${user.id}`;
  return json({ user: { ...user, lang } });
});
