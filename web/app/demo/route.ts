// The landing page's "try it as a customer" link. The demo shop's widget id lives in the server's env (set after seeding),
// so the landing page itself stays static.
export function GET() {
  const id = process.env.DEMO_WIDGET_ID;
  // relative Location: behind the proxy, req.url is the container's own address, not the public one
  return new Response(null, { status: 307, headers: { Location: id ? `/w/${encodeURIComponent(id)}` : "/signup" } });
}
