import { requireUser } from "@/lib/auth";
import { handle, json } from "@/lib/http";

export const GET = handle(async (req: Request) => json({ user: await requireUser(req) }));
