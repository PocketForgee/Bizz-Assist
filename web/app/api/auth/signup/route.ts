import { sql } from "@/lib/db";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { handle, HttpError, json, rateLimit, readJson, str } from "@/lib/http";
import { nxId } from "@/lib/ids";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST = handle(async (req: Request) => {
  rateLimit(req, "signup", 5, 60_000);
  const body = await readJson(req);
  const name = str(body, "name", { max: 80, label: "your name" });
  const businessName = str(body, "businessName", { max: 80, label: "your business name" });
  const email = str(body, "email", { max: 200, label: "your email" }).toLowerCase();
  if (!EMAIL.test(email)) throw new HttpError(400, "Enter a valid email address.", "email");
  const password = str(body, "password", { min: 8, max: 200, label: "a password" });

  const passHash = await hashPassword(password);
  const businessId = crypto.randomUUID();
  const userId = crypto.randomUUID();

  try {
    await sql.begin(async (tx) => {
      await tx`insert into businesses (id, name) values (${businessId}, ${businessName})`;
      await tx`
        insert into users (id, business_id, email, pass_hash, name, role, nx_user_id)
        values (${userId}, ${businessId}, ${email}, ${passHash}, ${name}, 'owner', ${nxId.agent(userId)})
      `;
    });
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      throw new HttpError(409, "An account with this email already exists. Sign in instead.", "email");
    }
    throw err;
  }

  const { token, expiresAt } = await createSession(userId);
  await setSessionCookie(token, expiresAt);
  return json({ ok: true, token, next: "/onboarding" }, 201);
});
