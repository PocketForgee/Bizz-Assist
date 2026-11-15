import { NextResponse, type NextRequest } from "next/server";

// The landing page's "try it as a customer" link. The demo shop's widget id lives in the server's env (set after seeding),
// so the landing page itself stays static.
export function GET(req: NextRequest) {
  const id = process.env.DEMO_WIDGET_ID;
  return NextResponse.redirect(new URL(id ? `/w/${encodeURIComponent(id)}` : "/signup", req.url), 307);
}
