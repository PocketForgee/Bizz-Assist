"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Bell, BellOff } from "lucide-react";
import type { NCChatUIApplication } from "@nexconn/chatui";
import { api } from "@/lib/client";
import type { QueueRow } from "@/lib/conversations";
import { Button, Chip, Segmented, cn } from "@/components/ui";
import { openGroup, startChatUI } from "@/components/chatui";

type Tab = "waiting" | "mine" | "closed";
type Detail = {
  conversation: {
    id: string;
    status: QueueRow["status"];
    nx_group_id: string;
    buyer_lang: string;
    summary: { issue?: string; bot_tried?: string; buyer_details?: string } | null;
    rating: number | null;
    resolved_by: string | null;
    created_at: string;
    waiting_since: string | null;
    assigned_user_id: string | null;
    assigned_name: string | null;
    widget: string;
  };
  messages: { id: string; role: "buyer" | "bot" | "agent"; text: string; created_at: string }[];
};

const POLL_MS = 3000;

function since(iso: string | null, now: number): string {
  if (!iso) return "";
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d`;
}

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.26);
    o.onended = () => void ctx.close();
  } catch {
    /* audio blocked until the user interacts with the page */
  }
}

/** Three-pane agent inbox: queue (polled), Nexconn ChatUI, context with Claim / Resolve. Used by /agent and /app/inbox. */
export function AgentInbox({ me, initialConversation, className }: { me: { id: string; role: "owner" | "agent" }; initialConversation?: string; className?: string }) {
  const [tab, setTab] = useState<Tab>("waiting");
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [counts, setCounts] = useState({ waiting: 0, mine: 0 });
  const [selected, setSelected] = useState<string | null>(initialConversation ?? null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [alerts, setAlerts] = useState<NotificationPermission | "unsupported">("default");
  const [chat, setChat] = useState<{ app: NCChatUIApplication | null; error: string | null }>({ app: null, error: null });
  const knownWaiting = useRef<Set<string> | null>(null);
  const chatHost = useRef<HTMLDivElement>(null);

  // ---- queue polling + new-chat alerts ----
  const loadQueue = useCallback(async () => {
    const res = await api<{ rows: QueueRow[]; counts: { waiting: number; mine: number } }>(`/api/agent/conversations?tab=${tab}`);
    if (!res.ok) return;
    setRows(res.data.rows);
    setCounts(res.data.counts);
  }, [tab]);

  const watchWaiting = useCallback(async () => {
    const res = await api<{ rows: QueueRow[] }>("/api/agent/conversations?tab=waiting");
    if (!res.ok) return;
    const ids = new Set(res.data.rows.map((r) => r.id));
    const known = knownWaiting.current;
    if (known) {
      const fresh = res.data.rows.filter((r) => !known.has(r.id));
      if (fresh.length) {
        beep();
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
          const n = new Notification("New chat waiting", { body: fresh[0].summary?.issue ?? fresh[0].last_text ?? "A customer needs help.", tag: fresh[0].id });
          n.onclick = () => {
            window.focus();
            setTab("waiting");
            setSelected(fresh[0].id);
          };
        }
      }
    }
    knownWaiting.current = ids;
  }, []);

  useEffect(() => {
    void loadQueue();
    const t = setInterval(loadQueue, POLL_MS);
    return () => clearInterval(t);
  }, [loadQueue]);

  useEffect(() => {
    void watchWaiting();
    const t = setInterval(watchWaiting, POLL_MS);
    return () => clearInterval(t);
  }, [watchWaiting]);

  useEffect(() => {
    setAlerts(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ---- selected conversation ----
  const loadDetail = useCallback(async (id: string) => {
    const res = await api<Detail>(`/api/agent/conversations/${id}`);
    if (res.ok) setDetail(res.data);
    else setError(res.error);
  }, []);

  useEffect(() => {
    setError(null);
    if (!selected) return setDetail(null);
    void loadDetail(selected);
    const t = setInterval(() => loadDetail(selected), POLL_MS * 2);
    return () => clearInterval(t);
  }, [selected, loadDetail]);

  const c = detail?.conversation;
  const canChat = Boolean(c && c.status === "agent" && c.assigned_user_id === me.id);

  // ---- ChatUI: start once when the agent first opens a chat they own ----
  useEffect(() => {
    if (!canChat || chat.app || chat.error) return;
    let cancelled = false;
    startChatUI()
      .then((app) => {
        if (cancelled) return;
        const host = chatHost.current;
        if (host && !host.firstChild) {
          const el = document.createElement("nc-channel-detail-provider");
          el.style.display = "block";
          el.style.width = "100%";
          el.style.height = "100%";
          host.appendChild(el);
        }
        setChat({ app, error: null });
      })
      .catch((err: Error) => !cancelled && setChat({ app: null, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [canChat, chat.app, chat.error]);

  useEffect(() => {
    if (chat.app && canChat && c) void openGroup(chat.app, c.nx_group_id).catch((e) => console.error("[inbox] openChannel failed", e));
  }, [chat.app, canChat, c?.nx_group_id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function claim() {
    if (!c) return;
    setBusy(true);
    setError(null);
    const res = await api(`/api/agent/conversations/${c.id}/claim`, { body: {} });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      void loadQueue();
      return;
    }
    setTab("mine");
    await loadDetail(c.id);
  }

  async function resolve() {
    if (!c || !confirm("Close this chat? The customer is asked for a rating.")) return;
    setBusy(true);
    setError(null);
    const res = await api(`/api/agent/conversations/${c.id}/resolve`, { body: {} });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    await loadDetail(c.id);
    void loadQueue();
  }

  async function enableAlerts() {
    if (typeof Notification === "undefined") return;
    setAlerts(await Notification.requestPermission());
    beep();
  }

  return (
    <div className={cn("grid min-h-0 bg-canvas lg:grid-cols-[320px_1fr_300px] md:grid-cols-[300px_1fr]", className)}>
      {/* 1. Queue */}
      <section aria-label="Queue" className={cn("flex min-h-0 flex-col border-r border-hairline", selected && "max-md:hidden")}>
        <div className="flex flex-col gap-3 border-b border-hairline p-3">
          <div className="flex items-center justify-between">
            <Segmented<Tab>
              label="Queue"
              value={tab}
              onChange={(t) => {
                setTab(t);
                setRows([]);
              }}
              options={[
                { value: "waiting", label: counts.waiting ? `Waiting ${counts.waiting}` : "Waiting" },
                { value: "mine", label: counts.mine ? `Mine ${counts.mine}` : "Mine" },
                { value: "closed", label: "Closed" },
              ]}
            />
            {alerts !== "unsupported" && (
              <button
                type="button"
                onClick={enableAlerts}
                disabled={alerts === "granted"}
                aria-label={alerts === "granted" ? "Alerts are on" : "Turn on alerts"}
                title={alerts === "granted" ? "Alerts are on" : "Turn on alerts"}
                className="press flex size-11 items-center justify-center rounded-full text-ink-48 hover:bg-parchment disabled:text-success"
              >
                {alerts === "granted" ? <Bell size={18} aria-hidden /> : <BellOff size={18} aria-hidden />}
              </button>
            )}
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {rows.length === 0 && (
            <li className="t-caption px-4 py-10 text-center text-ink-48">
              {tab === "waiting" ? "No one is waiting. New chats appear here." : tab === "mine" ? "Claim a waiting chat to start." : "Closed chats show here."}
            </li>
          )}
          {rows.map((r) => (
            <li key={r.id} className="row-in">
              <button
                type="button"
                onClick={() => setSelected(r.id)}
                aria-current={selected === r.id ? "true" : undefined}
                className={cn("flex w-full flex-col gap-1 border-b border-divider px-4 py-3 text-left hover:bg-parchment/60", selected === r.id && "bg-parchment")}
              >
                <span className="flex items-center gap-2">
                  <Chip className="uppercase">{r.buyer_lang}</Chip>
                  <span className="t-fine flex-1 truncate text-ink-48">{r.widget}</span>
                  <span className="t-fine tabular-nums text-ink-48">
                    {tab === "waiting" ? since(r.waiting_since, now) : tab === "closed" ? (r.rating ? `${r.rating}★` : "") : since(r.last_at, now)}
                  </span>
                </span>
                <span className="t-caption line-clamp-2 text-ink" dir="auto">
                  {r.summary?.issue ?? r.last_text ?? "New conversation"}
                </span>
                {tab === "closed" && r.assigned_name && <span className="t-fine text-ink-48">{r.assigned_name}</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* 2. Chat */}
      <section aria-label="Chat" className={cn("flex min-h-0 flex-col", !selected && "max-md:hidden")}>
        {selected && (
          <button type="button" onClick={() => setSelected(null)} className="t-caption flex min-h-11 items-center gap-1 border-b border-hairline px-3 text-primary md:hidden">
            <ArrowLeft size={16} aria-hidden /> Queue
          </button>
        )}
        <div ref={chatHost} className={cn("min-h-0 flex-1", !(canChat && chat.app) && "hidden")} />
        {!(canChat && chat.app) && (
          <div className="min-h-0 flex-1 overflow-y-auto bg-pearl px-4 py-4">
            {!detail ? (
              <p className="t-caption mt-20 text-center text-ink-48">Pick a chat from the queue.</p>
            ) : (
              <>
                {canChat && (
                  <p className="t-caption mb-3 rounded-md bg-parchment px-3 py-2 text-ink-80" role="status">
                    {chat.error ? `Live chat unavailable: ${chat.error}` : "Connecting to the live chat…"}
                  </p>
                )}
                <ol className="flex flex-col gap-2">
                  {detail.messages.map((m) => (
                    <li key={m.id} className={cn("flex max-w-[80%] flex-col", m.role === "buyer" ? "self-start" : "self-end items-end")}>
                      <span className="t-fine mb-0.5 text-ink-48">{m.role === "buyer" ? "Customer" : m.role === "bot" ? "Assistant" : "Agent"}</span>
                      <p dir="auto" className={cn("whitespace-pre-wrap rounded-[18px] px-3.5 py-2 text-[15px]", m.role === "buyer" ? "bg-canvas border border-hairline" : m.role === "bot" ? "bg-parchment" : "bg-primary text-white")}>
                        {m.text}
                      </p>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        )}
      </section>

      {/* 3. Context */}
      <aside aria-label="Details" className={cn("flex min-h-0 flex-col border-l border-hairline max-lg:border-l-0 max-lg:border-t md:col-span-2 lg:col-span-1", !selected && "max-lg:hidden")}>
        {c ? (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone={c.status === "waiting" ? "warning" : c.status === "agent" ? "info" : c.status === "closed" ? "success" : "neutral"}>
                  {c.status === "waiting" ? `Waiting ${since(c.waiting_since, now)}` : c.status === "agent" ? `With ${c.assigned_user_id === me.id ? "you" : (c.assigned_name ?? "an agent")}` : c.status === "closed" ? "Closed" : "With AI"}
                </Chip>
                <Chip className="uppercase">{c.buyer_lang}</Chip>
                {c.rating && <Chip>{c.rating}★ rating</Chip>}
              </div>
              <dl className="space-y-3">
                <div>
                  <dt className="t-fine text-ink-48">Issue</dt>
                  <dd className="t-caption">{c.summary?.issue ?? "Summary is being written…"}</dd>
                </div>
                <div>
                  <dt className="t-fine text-ink-48">What the bot tried</dt>
                  <dd className="t-caption">{c.summary?.bot_tried ?? "–"}</dd>
                </div>
                <div>
                  <dt className="t-fine text-ink-48">Customer details</dt>
                  <dd className="t-caption">{c.summary?.buyer_details ?? "–"}</dd>
                </div>
                <div>
                  <dt className="t-fine text-ink-48">Widget</dt>
                  <dd className="t-caption">{c.widget}</dd>
                </div>
              </dl>
            </div>
            <div className="border-t border-hairline p-4">
              {error && (
                <p className="t-caption mb-3 text-danger" role="alert">
                  {error}
                </p>
              )}
              {c.status === "waiting" && (
                <Button onClick={claim} disabled={busy} className="w-full">
                  {busy ? "Claiming…" : "Claim chat"}
                </Button>
              )}
              {c.status === "agent" && (c.assigned_user_id === me.id || me.role === "owner") && (
                <Button variant="secondary" onClick={resolve} disabled={busy} className="w-full">
                  {busy ? "Closing…" : "Resolve"}
                </Button>
              )}
              {c.status === "closed" && <p className="t-caption text-ink-48">Closed{c.resolved_by === "agent" ? " by an agent. Its answers are reviewed under Train › Learned." : "."}</p>}
            </div>
          </>
        ) : (
          <p className="t-caption p-4 text-ink-48">Details of the selected chat show here.</p>
        )}
      </aside>
    </div>
  );
}
