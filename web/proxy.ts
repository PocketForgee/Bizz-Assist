import { NextResponse, type NextRequest } from "next/server";
import { widgetFramePolicy } from "@/lib/widget-policy";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Buyer page /w/:id may only be framed by the widget's allowed domains (CSP frame-ancestors).
export async function proxy(request: NextRequest) {
  const id = request.nextUrl.pathname.split("/")[2] ?? "";
  const res = NextResponse.next();
  if (!UUID.test(id)) return res;
  try {
    const csp = await widgetFramePolicy(id.toLowerCase());
    res.headers.set("Content-Security-Policy", csp ?? "frame-ancestors 'self'");
  } catch (err) {
    console.error("[proxy] frame policy lookup failed", err);
    res.headers.set("Content-Security-Policy", "frame-ancestors 'self'");
  }
  return res;
}

export const config = {
  matcher: "/w/:path*",
};
