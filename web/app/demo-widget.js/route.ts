// Loads BizzAssist's own chat widget on the landing page. The widget id lives in the server's env, so the page stays static.
export function GET() {
  const id = process.env.DEMO_WIDGET_ID ?? "";
  const body = /^[0-9a-f-]{36}$/i.test(id)
    ? `(function(){var s=document.createElement("script");s.src="/widget.js";s.async=true;s.setAttribute("data-widget",${JSON.stringify(id)});document.head.appendChild(s)})();`
    : "";
  return new Response(body, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" } });
}
