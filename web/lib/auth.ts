import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { HttpError } from "./http";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const SESSION_COOKIE = "ba_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  business_id: string;
  email: string;
  name: string;
  role: "owner" | "agent";
  lang: string;
  nx_user_id: string;
  business_name: string;
  plan: "free" | "pro" | "business";
  onboarded: boolean;
};

// ---- passwords: scrypt, stored as "scrypt$<salt b64>$<hash b64>" ----

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ---- sessions: random token to the client, only its sha256 in the DB ----

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await sql`insert into sessions (token_hash, user_id, expires_at) values (${sha256(token)}, ${userId}, ${expiresAt})`;
  return { token, expiresAt };
}

export async function deleteSession(token: string) {
  await sql`delete from sessions where token_hash = ${sha256(token)}`;
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

async function userForToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token || token.length > 128) return null;
  const rows = await sql<SessionUser[]>`
    select u.id, u.business_id, u.email, u.name, u.role, u.lang, u.nx_user_id,
           b.name as business_name, b.plan, (b.onboarded_at is not null) as onboarded
    from sessions s
    join users u on u.id = s.user_id
    join businesses b on b.id = u.business_id
    where s.token_hash = ${sha256(token)} and s.expires_at > now()
  `;
  return rows[0] ?? null;
}

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

/** Route handlers: cookie (web) or Authorization: Bearer (Android). Throws 401. */
export async function requireUser(req: Request, opts: { role?: "owner" } = {}): Promise<SessionUser> {
  const token = bearer(req) ?? (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await userForToken(token);
  if (!user) throw new HttpError(401, "Sign in to continue.");
  if (opts.role === "owner" && user.role !== "owner") throw new HttpError(403, "Only the business owner can do this.");
  return user;
}

/** Server components: current user or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  return userForToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Server components inside /app: redirects to login / onboarding as needed. */
export async function requirePageUser(opts: { allowUnonboarded?: boolean; owner?: boolean } = {}): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.onboarded && !opts.allowUnonboarded) redirect("/onboarding");
  if (opts.owner && user.role !== "owner") redirect("/app/inbox");
  return user;
}
