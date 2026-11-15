"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUp, Bell, BellOff, Check, Info, Languages, X } from "lucide-react";
import { api } from "@/lib/client";
import type { QueueRow } from "@/lib/conversations";
import { Button, Segmented, cn } from "@/components/ui";
import { Mark } from "@/components/brand";

type Tab = "waiting" | "mine" | "closed";
type Msg = { id: string; role: "buyer" | "bot" | "agent"; text: string; translation: string | null; created_at: string; pending?: boolean };
type Detail = {
  conversation: {
    id: string;
    status: QueueRow["status"];
    nx_group_id: string;
    guest_nx_id: string;
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
  messages: Msg[];
};

const POLL_MS = 3000;
const LIVE_MS = 1500; // an open, live chat: near-real-time transcript

function since(iso: string | null, now: number): string {
  if (!iso) return "";
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d`;
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const customerName = (id: string | undefined) => `Customer ${(id ?? "").slice(-4).toUpperCase()}`.trim();

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

/** Three-pane agent inbox: queue (polled), the conversation (stored transcript + reply), context. Used by /agent and /app/inbox. */
export function AgentInbox({ me, initialConversation, className }: { me: { id: string; role: "owner" | "agent" }; initialConversation?: string; className?: string }) {
  const [tab, setTab] = useState<Tab>("waiting");
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [counts, setCounts] = useState({ waiting: 0, mine: 0 });
  const [selected, setSelected] = useState<string | null>(initialConversation ?? null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [alerts, setAlerts] = useState<NotificationPermission | "unsupported">("default");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const knownWaiting = useRef<Set<string> | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const firstLoad = useRef(true);

  // ---- queue polling + new-chat alerts ----
  const loadQueue = useCallback(async () => {
    const res = await api<{ rows: QueueRow[]; counts: { waiting: number; mine: number } }>(`/api/agent/conversations?tab=${tab}`);
    if (!res.ok) return;
    setRows(res.data.rows);
    setCounts(res.data.counts);
    setLoaded(true);
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
    if (!res.ok) return setError(res.error);
    // keep optimistic replies the server hasn't returned yet
    setDetail((d) => {
      const pending = d && d.conversation.id === id ? d.messages.filter((m) => m.pending) : [];
      const stillPending = pending.filter((p) => !res.data.messages.some((m) => m.role === "agent" && m.text === p.text));
      return { ...res.data, messages: [...res.data.messages, ...stillPending] };
    });
  }, []);

  const c = detail?.conversation;
  const canChat = Boolean(c && c.status === "agent" && c.assigned_user_id === me.id);
  const live = c?.status === "agent" || c?.status === "waiting" || c?.status === "bot";

  useEffect(() => {
    setError(null);
    setDraft("");
    setShowInfo(false);
    setDetail(null);
    firstLoad.current = true;
    if (selected) void loadDetail(selected);
  }, [selected, loadDetail]);

  useEffect(() => {
    if (!selected) return;
    const t = setInterval(() => document.visibilityState === "visible" && loadDetail(selected), live ? LIVE_MS : POLL_MS * 2);
    return () => clearInterval(t);
  }, [selected, live, loadDetail]);

  // follow new messages, unless the agent scrolled up to read
  const lastId = detail?.messages.at(-1)?.id;
  useEffect(() => {
    const el = scroller.current;
    if (!el || !lastId) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (firstLoad.current || nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: firstLoad.current ? "auto" : "smooth" });
    firstLoad.current = false;
  }, [lastId]);

  useEffect(() => {
    if (canChat) input.current?.focus();
  }, [canChat]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!c || !text || sending) return;
    setSending(true);
    setDraft("");
    const temp: Msg = { id: `tmp-${Date.now()}`, role: "agent", text, translation: null, created_at: new Date().toISOString(), pending: true };
    setDetail((d) => (d ? { ...d, messages: [...d.messages, temp] } : d));
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }));
    const res = await api<{ message: Msg }>(`/api/agent/conversations/${c.id}/messages`, { body: { text } });
    setSending(false);
    if (!res.ok) {
      setDraft(text);
      setError(res.error);
      setDetail((d) => (d ? { ...d, messages: d.messages.filter((m) => m.id !== temp.id) } : d));
      return;
    }
    setDetail((d) => (d ? { ...d, messages: d.messages.map((m) => (m.id === temp.id ? res.data.message : m)) } : d));
    input.current?.focus();
  }

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

  const statusLine = !c
    ? null
    : c.status === "waiting"
      ? { tone: "text-warning", label: `Waiting ${since(c.waiting_since, now)}`, live: true }
      : c.status === "agent"
        ? { tone: "text-primary", label: c.assigned_user_id === me.id ? "With you" : `With ${c.assigned_name ?? "an agent"}`, live: true }
        : c.status === "closed"
          ? { tone: "text-ink-48", label: "Closed", live: false }
          : { tone: "text-ink-48", label: "With the assistant", live: true };

  const context = c && (
    <div className="flex flex-col gap-6 p-5">
      <section>
        <h3 className="t-fine mb-3 text-ink-48">Summary from the assistant</h3>
        <dl className="flex flex-col gap-4">
          {[
            ["Issue", c.summary?.issue ?? (c.status === "bot" ? "Still with the assistant" : "Being written…")],
            ["What the assistant tried", c.summary?.bot_tried],
            ["Customer details", c.summary?.buyer_details],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="t-caption text-ink-48">{k}</dt>
              <dd className="mt-0.5 text-[14px] text-ink" dir="auto">
                {v || "–"}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="border-t border-hairline pt-5">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[14px]">
          <dt className="text-ink-48">Language</dt>
          <dd className="t-mono self-center uppercase text-ink">{c.buyer_lang}</dd>
          <dt className="text-ink-48">Widget</dt>
          <dd className="truncate text-ink">{c.widget}</dd>
          <dt className="text-ink-48">Started</dt>
          <dd className="t-mono self-center text-ink">{new Date(c.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</dd>
          {c.rating != null && (
            <>
              <dt className="text-ink-48">Rating</dt>
              <dd className="t-mono self-center text-ink">{c.rating} / 5</dd>
            </>
          )}
        </dl>
      </section>
      {c.status === "closed" && c.resolved_by === "agent" && (
        <p className="t-caption rounded-md bg-primary-soft px-3 py-2.5 text-primary">Answers from this chat are offered under Train › Learned for approval.</p>
      )}
    </div>
  );

  return (
    <div className={cn("grid min-h-0 bg-canvas md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_300px]", className)}>
      {/* 1. Queue */}
      <section aria-label="Queue" className={cn("flex min-h-0 flex-col border-r border-hairline bg-pearl", selected && "max-md:hidden")}>
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-hairline px-3">
          <Segmented<Tab>
            label="Queue"
            value={tab}
            onChange={(t) => {
              setTab(t);
              setRows([]);
              setLoaded(false);
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
              className="press flex size-9 items-center justify-center rounded-md text-ink-48 hover:bg-parchment hover:text-ink disabled:text-primary"
            >
              {alerts === "granted" ? <Bell size={16} strokeWidth={1.5} aria-hidden /> : <BellOff size={16} strokeWidth={1.5} aria-hidden />}
            </button>
          )}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {loaded && rows.length === 0 && (
            <li className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <Check size={18} strokeWidth={1.5} className="text-ink-48" aria-hidden />
              <p className="t-caption text-ink-48">
                {tab === "waiting" ? "No one is waiting. New chats appear here with a sound." : tab === "mine" ? "Claim a waiting chat to start." : "Closed chats show here."}
              </p>
            </li>
          )}
          {!loaded &&
            [0, 1, 2].map((i) => <li key={i} className="mb-1 h-[76px] rounded-md bg-parchment" style={{ opacity: 1 - i * 0.3 }} aria-hidden />)}
          {rows.map((r) => {
            const active = selected === r.id;
            return (
              <li key={r.id} className="row-in mb-1">
                <button
                  type="button"
                  onClick={() => setSelected(r.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "press flex w-full flex-col gap-1.5 rounded-md px-3 py-2.5 text-left",
                    active ? "bg-canvas shadow-[0_1px_2px_rgb(0_0_0/0.06),0_0_0_1px_rgb(0_0_0/0.06)]" : "hover:bg-[rgb(23_23_23/0.04)]",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {r.status === "waiting" && <span className="live-dot shrink-0 text-warning" aria-label="Waiting" />}
                    <span className="flex-1 truncate text-[14px] font-medium text-ink">{customerName(r.nx_group_id)}</span>
                    <span className={cn("t-mono shrink-0", r.status === "waiting" ? "text-warning" : "text-ink-48")}>
                      {tab === "waiting" ? since(r.waiting_since, now) : tab === "closed" ? (r.rating ? `${r.rating}/5` : "") : since(r.last_at, now)}
                    </span>
                  </span>
                  <span className="t-caption line-clamp-2 text-ink-80" dir="auto">
                    {r.summary?.issue ?? r.last_text ?? "New conversation"}
                  </span>
                  <span className="flex items-center gap-2 text-ink-48">
                    <span className="t-mono uppercase">{r.buyer_lang}</span>
                    <span aria-hidden>·</span>
                    <span className="t-fine truncate">{tab === "closed" && r.assigned_name ? r.assigned_name : r.widget}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 2. Conversation */}
      <section aria-label="Conversation" className={cn("relative flex min-h-0 flex-col", !selected && "max-md:hidden")}>
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <Mark size={28} className="text-ink/15" />
            <p className="t-caption max-w-xs text-ink-48">Pick a chat from the queue. Chats the assistant hands over arrive under Waiting.</p>
          </div>
        ) : (
          <>
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline px-3 sm:px-5">
              <button type="button" onClick={() => setSelected(null)} aria-label="Back to the queue" className="press -ml-1 flex size-9 items-center justify-center rounded-md hover:bg-parchment md:hidden">
                <ArrowLeft size={18} aria-hidden />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">{c ? customerName(c.nx_group_id) : "Loading…"}</p>
                {statusLine && (
                  <p className={cn("t-fine flex items-center gap-1.5", statusLine.tone)}>
                    {statusLine.live && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
                    <span className="tabular-nums">{statusLine.label}</span>
                    <span className="truncate text-ink-48">· {c?.widget}</span>
                  </p>
                )}
              </div>
              {c?.status === "waiting" && (
                <Button onClick={claim} disabled={busy}>
                  {busy ? "Claiming…" : "Claim chat"}
                </Button>
              )}
              {c?.status === "agent" && (c.assigned_user_id === me.id || me.role === "owner") && (
                <Button variant="secondary" onClick={resolve} disabled={busy}>
                  <Check size={16} strokeWidth={1.5} aria-hidden />
                  {busy ? "Closing…" : "Resolve"}
                </Button>
              )}
              <button
                type="button"
                onClick={() => setShowInfo(true)}
                aria-label="Chat details"
                className="press flex size-9 items-center justify-center rounded-md text-ink-48 hover:bg-parchment hover:text-ink xl:hidden"
              >
                <Info size={16} strokeWidth={1.5} aria-hidden />
              </button>
            </header>

            <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto bg-pearl">
              {!detail ? (
                <div className="mx-auto flex max-w-[720px] flex-col gap-3 px-5 py-6" aria-hidden>
                  {["w-2/3", "w-1/2 self-end", "w-3/5"].map((w, i) => (
                    <div key={i} className={cn("h-12 rounded-[14px] bg-parchment", w)} />
                  ))}
                </div>
              ) : (
                <ol className="mx-auto flex max-w-[720px] flex-col px-4 py-6 sm:px-6">
                  {detail.messages.length === 0 && <li className="t-caption py-10 text-center text-ink-48">No messages yet.</li>}
                  {detail.messages.map((m, i) => {
                    const prev = detail.messages[i - 1];
                    const head = !prev || prev.role !== m.role;
                    const mine = m.role !== "buyer";
                    return (
                      <li key={m.id} className={cn("bubble-in flex max-w-[82%] flex-col", mine ? "items-end self-end" : "items-start self-start", head ? "mt-4 first:mt-0" : "mt-1")}>
                        {head && (
                          <span className="t-fine mb-1 flex items-center gap-1.5 px-1 text-ink-48">
                            {m.role === "bot" && <Mark size={12} className="text-ink-48" />}
                            {m.role === "buyer" ? customerName(c?.nx_group_id) : m.role === "bot" ? "Assistant" : "Agent"}
                            <span className="t-mono text-[11px]">{clock(m.created_at)}</span>
                          </span>
                        )}
                        <p
                          dir="auto"
                          className={cn(
                            "whitespace-pre-wrap break-words px-3.5 py-2 text-[15px] leading-[1.45]",
                            m.role === "buyer" && "rounded-[14px] border border-hairline bg-canvas text-ink",
                            m.role === "bot" && "rounded-[14px] bg-parchment text-ink",
                            m.role === "agent" && "rounded-[14px] bg-ink text-white",
                            head && (m.role === "buyer" ? "rounded-tl-[4px]" : "rounded-tr-[4px]"),
                            m.pending && "opacity-60",
                          )}
                        >
                          {m.text}
                        </p>
                        {m.translation && (
                          <div className="mt-1.5 max-w-full rounded-[10px] border border-dashed border-hairline bg-canvas px-3 py-2">
                            <span className="t-fine flex items-center gap-1.5 text-ink-48">
                              <Languages size={12} strokeWidth={1.5} aria-hidden />
                              {m.role === "buyer" ? "Translated for you" : `Sent in ${c?.buyer_lang.toUpperCase()}`}
                            </span>
                            <p dir="auto" className="mt-0.5 text-[14px] text-ink-80">
                              {m.translation}
                            </p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {error && (
              <p className="t-caption flex items-center gap-2 border-t border-danger/20 bg-danger/5 px-5 py-2 text-danger" role="alert">
                <span className="flex-1">{error}</span>
                <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="press rounded-sm p-1 hover:bg-danger/10">
                  <X size={14} aria-hidden />
                </button>
              </p>
            )}

            {c && (
              <div className="shrink-0 border-t border-hairline bg-canvas p-3">
                {canChat ? (
                  <form
                    onSubmit={send}
                    className="mx-auto flex max-w-[720px] items-end gap-2 rounded-[14px] border border-hairline bg-canvas p-1.5 pl-3.5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--primary-soft)]"
                  >
                    <label htmlFor="agent-reply" className="sr-only">
                      Reply
                    </label>
                    <textarea
                      ref={input}
                      id="agent-reply"
                      rows={Math.min(6, Math.max(1, draft.split("\n").length))}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          void send();
                        }
                      }}
                      placeholder={`Reply to ${customerName(c.nx_group_id)}`}
                      maxLength={2000}
                      className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 text-ink placeholder:text-ink-48 focus:outline-none"
                    />
                    <span className="t-fine hidden self-center text-ink-48 sm:block">
                      <kbd className="t-mono rounded-[4px] border border-hairline px-1 py-0.5">Enter</kbd> to send
                    </span>
                    <button
                      type="submit"
                      disabled={!draft.trim() || sending}
                      aria-label="Send"
                      className="press flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary text-white disabled:bg-parchment disabled:text-ink-48"
                    >
                      <ArrowUp size={16} aria-hidden />
                    </button>
                  </form>
                ) : (
                  <p className="t-caption mx-auto max-w-[720px] px-1 text-ink-48">
                    {c.status === "waiting"
                      ? "Claim the chat to reply. The customer sees you join."
                      : c.status === "agent"
                        ? `${c.assigned_name ?? "Another agent"} is answering this chat.`
                        : c.status === "closed"
                          ? "This chat is closed."
                          : "The assistant is answering. It hands over when it can't help."}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* 3. Context: a column on wide screens, a sheet below that */}
      <aside aria-label="Details" className="hidden min-h-0 overflow-y-auto border-l border-hairline xl:block">
        {context ?? <p className="t-caption p-5 text-ink-48">Details of the selected chat show here.</p>}
      </aside>
      {showInfo && context && (
        <div className="fixed inset-0 z-40 xl:hidden" role="dialog" aria-modal="true" aria-label="Chat details">
          <button type="button" aria-label="Close" className="fade-in absolute inset-0 bg-[rgb(15_15_16/0.28)]" onClick={() => setShowInfo(false)} />
          <div className="sheet-in absolute inset-y-2 right-2 w-[calc(100%-16px)] max-w-[360px] overflow-y-auto rounded-lg border border-hairline bg-canvas shadow-[var(--shadow-pop)]">
            <div className="flex h-14 items-center justify-between border-b border-hairline px-5">
              <h2 className="text-[16px] font-medium">Chat details</h2>
              <button type="button" onClick={() => setShowInfo(false)} aria-label="Close" className="press -mr-2 flex size-9 items-center justify-center rounded-md text-ink-48 hover:bg-parchment">
                <X size={16} aria-hidden />
              </button>
            </div>
            {context}
          </div>
        </div>
      )}
    </div>
  );
}
