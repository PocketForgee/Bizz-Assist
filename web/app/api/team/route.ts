import { requireUser, hashPassword } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handle, HttpError, json, readJson, str } from "@/lib/http";
import { nxId, randomAlnum } from "@/lib/ids";
import { assertLimit } from "@/lib/plans";
import { isNexconnConfigured, issueToken } from "@/lib/nexconn";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GET = handle(async (req: Request) => {
  const user = await requireUser(req, { role: "owner" });
  const members = await sql`
    select id, name, email, role, lang, created_at from users where business_id = ${user.business_id} order by role desc, created_at
  `;
  return json({ members });
});

// shortcut: no invite email, owner shares credentials. Temporary password is shown once and never stored in clear.
export const POST = handle(async (req: Request) => {
  const owner = await requireUser(req, { role: "owner" });
  const body = await readJson(req);
  const name = str(body, "name", { max: 80, label: "a name" });
  const email = str(body, "email", { max: 200, label: "an email" }).toLowerCase();
  if (!EMAIL.test(email)) throw new HttpError(400, "Enter a valid email address.", "email");
  const lang = (str(body, "lang", { max: 10, optional: true }) || "en").toLowerCase();

  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from users where business_id = ${owner.business_id} and role = 'agent'`;
  assertLimit(owner.plan, "agents", n);

  const password = randomAlnum(12);
  const id = crypto.randomUUID();
  try {
    await sql`
      insert into users (id, business_id, email, pass_hash, name, role, lang, nx_user_id)
      values (${id}, ${owner.business_id}, ${email}, ${await hashPassword(password)}, ${name}, 'agent', ${lang}, ${nxId.agent(id)})
    `;
  } catch (err) {
    if ((err as { code?: string }).code === "23505") throw new HttpError(409, "That email already has an account.", "email");
    throw err;
  }
  // register the Nexconn user now so escalation alerts reach them before their first sign-in
  if (isNexconnConfigured()) await issueToken(nxId.agent(id), name).catch((e) => console.error("[team] nexconn register failed", e));
  return json({ member: { id, name, email, role: "agent", lang }, password }, 201);
});
