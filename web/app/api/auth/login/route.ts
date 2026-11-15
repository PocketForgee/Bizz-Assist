import { sql } from "@/lib/db";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { handle, HttpError, json, rateLimit, readJson, str } from "@/lib/http";

type Row = {
  id: string;
  business_id: string;
  name: string;
  email: string;
  role: "owner" | "agent";
  lang: string;
  nx_user_id: string;
  pass_hash: string;
  onboarded: boolean;
};

// Web: sets the httpOnly cookie. Android: uses the returned token as `Authorization: Bearer`.
export const POST = handle(async (req: Request) => {
  rateLimit(req, "login", 10, 60_000);
  const body = await readJson(req);
  const email = str(body, "email", { max: 200, label: "your email" }).toLowerCase();
  const password = str(body, "password", { max: 200, label: "your password" });

  const [user] = await sql<Row[]>`
    select u.id, u.business_id, u.name, u.email, u.role, u.lang, u.nx_user_id, u.pass_hash,
           (b.onboarded_at is not null) as onboarded
    from users u join businesses b on b.id = u.business_id
    where u.email = ${email}
  `;
  // same message for unknown email and wrong password
  if (!user || !(await verifyPassword(password, user.pass_hash))) {
    throw new HttpError(401, "That email and password don't match.", "password");
  }

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);
  const { pass_hash: _omit, ...publicUser } = user;
  void _omit;
  return json({
    ok: true,
    token,
    user: publicUser,
    next: user.onboarded ? (user.role === "owner" ? "/app" : "/agent") : "/onboarding",
  });
});
