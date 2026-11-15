import { sql } from "@/lib/db";
import { handle, HttpError, json, rateLimit, readJson, requireUuid, str } from "@/lib/http";
import { isGuestId, nxId } from "@/lib/ids";
import { clientConfig, createGroup, isNexconnConfigured, issueToken } from "@/lib/nexconn";

type Ctx = { params: Promise<{ widgetId: string }> };

// Bot users only need registering once per process; issueToken is idempotent on Nexconn's side.
const registeredBots = new Set<string>();

/**
 * Public: called by the buyer page. Returns a Nexconn token for the guest and the group to open.
 * The guestId lives in the buyer's localStorage and works as their (anonymous) credential.
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  rateLimit(req, "w-session", 20, 60_000);
  const widgetId = requireUuid((await ctx.params).widgetId, "widget");
  const body = await readJson(req);
  const lang = (str(body, "lang", { max: 10, optional: true }) || "en").toLowerCase();

  const [widget] = await sql<{ id: string; business_id: string; title: string; business_name: string; logo_url: string | null }[]>`
    select w.id, w.business_id, w.title, b.name as business_name, b.logo_url
    from widgets w join businesses b on b.id = w.business_id where w.id = ${widgetId}
  `;
  if (!widget) throw new HttpError(404, "This chat does not exist.");
  if (!isNexconnConfigured()) throw new HttpError(503, "Chat is not set up yet. Try again later.");

  const guestId = isGuestId(body.guestId) ? body.guestId : nxId.guest();
  const token = await issueToken(guestId, "Guest");

  let [conv] = await sql<{ id: string; nx_group_id: string; status: string }[]>`
    select id, nx_group_id, status from conversations
    where widget_id = ${widget.id} and guest_nx_id = ${guestId} and status <> 'closed'
    order by created_at desc limit 1
  `;

  if (!conv) {
    const bot = nxId.bot(widget.business_id);
    if (!registeredBots.has(bot)) {
      await issueToken(bot, widget.business_name.slice(0, 64), widget.logo_url ?? undefined);
      registeredBots.add(bot);
    }
    const convId = crypto.randomUUID();
    const groupId = nxId.group(convId);
    await createGroup(groupId, widget.title.slice(0, 64), bot, [guestId]);
    [conv] = await sql<{ id: string; nx_group_id: string; status: string }[]>`
      insert into conversations (id, business_id, widget_id, nx_group_id, guest_nx_id, buyer_lang)
      values (${convId}, ${widget.business_id}, ${widget.id}, ${groupId}, ${guestId}, ${lang})
      returning id, nx_group_id, status
    `;
  }

  return json({
    ...(await statusFor(conv.id, conv.status)),
    ...clientConfig(),
    token,
    guestId,
    groupId: conv.nx_group_id,
    conversationId: conv.id,
    botId: nxId.bot(widget.business_id),
  });
});

/** Public, cheap: the buyer page polls this after each reply to update its status line. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  rateLimit(req, "w-status", 60, 60_000);
  const widgetId = requireUuid((await ctx.params).widgetId, "widget");
  const guestId = new URL(req.url).searchParams.get("guestId");
  if (!isGuestId(guestId)) throw new HttpError(400, "Missing guest.");
  const [conv] = await sql<{ id: string; status: string }[]>`
    select id, status from conversations
    where widget_id = ${widgetId} and guest_nx_id = ${guestId}
    order by created_at desc limit 1
  `;
  if (!conv) throw new HttpError(404, "No conversation.");
  return json(await statusFor(conv.id, conv.status));
});

async function statusFor(conversationId: string, status: string) {
  if (status !== "waiting") return { status, position: null as number | null };
  const [{ position }] = await sql<{ position: number }[]>`
    select count(*)::int as position from conversations o, conversations c
    where c.id = ${conversationId} and o.business_id = c.business_id
      and o.status = 'waiting' and o.waiting_since <= c.waiting_since
  `;
  return { status, position };
}
