import { cookies } from "next/headers";
import { clearSessionCookie, deleteSession, SESSION_COOKIE } from "@/lib/auth";
import { handle, json } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  await clearSessionCookie();
  return json({ ok: true });
});
