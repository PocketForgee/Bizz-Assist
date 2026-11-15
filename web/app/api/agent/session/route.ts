import { requireUser } from "@/lib/auth";
import { handle, HttpError, json } from "@/lib/http";
import { clientConfig, isNexconnConfigured, issueToken } from "@/lib/nexconn";

/** Nexconn token for the signed-in agent (web inbox ChatUI and the Android app). */
export const GET = handle(async (req: Request) => {
  const user = await requireUser(req);
  if (!isNexconnConfigured()) throw new HttpError(503, "Chat is not set up yet (Nexconn keys missing).");
  const token = await issueToken(user.nx_user_id, user.name);
  return json({ ...clientConfig(), token, userId: user.nx_user_id, name: user.name });
});
