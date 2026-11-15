"use client";

// Buyer chat on @nexconn/chat with our own UI.
// Decision (nexconn-chat skill, Layer 3: Chat SDK API + custom UI): Nexconn ChatUI does not support
// portrait mobile browsers, and most buyers arrive on a phone.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "@nexconn/chat";
import { api } from "@/lib/client";
import type { PublicWidget } from "@/lib/widgets";
import { ChatView, onAccent, type ChatMessage } from "@/components/chat-view";
import { cn } from "@/components/ui";

type Session = {
  appKey: string;
  areaCode: import("@nexconn/chat").AreaCode; // numeric code from the server (SG=2, NA=3, SA=5)
  token: string;
  guestId: string;
  groupId: string;
  conversationId: string;
  status: "bot" | "waiting" | "agent" | "closed";
  position: number | null;
};

type Phase = "connecting" | "ready" | "offline" | "error";

const HANDLER_ID = "bizzassist-buyer";
const TYPING_TIMEOUT_MS = 25_000;
let engineReady = false; // NCEngine.initialize must run once per page

const roleOf = (senderId: string): ChatMessage["role"] => (senderId.startsWith("g") ? "buyer" : senderId.startsWith("a") ? "agent" : "bot");

function textOf(m: Message): string {
  const c = (m.content ?? {}) as { text?: unknown; content?: unknown };
  return typeof c.text === "string" ? c.text : typeof c.content === "string" ? c.content : "";
}

function statusLine(s: Session | null, phase: Phase): string {
  if (phase === "connecting") return "Connecting…";
  if (phase === "offline") return "Reconnecting…";
  if (phase === "error" || !s) return "Chat unavailable";
  switch (s.status) {
    case "waiting":
      return s.position && s.position > 1 ? `Waiting for a person · #${s.position} in line` : "Waiting for a person · you're next";
    case "agent":
      return "Chatting with our team";
    case "closed":
      return "Conversation closed";
    default:
      return "Usually replies instantly";
  }
}

export function BuyerChat({ widget, embed }: { widget: PublicWidget; embed: boolean }) {
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  const stopTyping = useCallback(() => {
    setTyping(false);
    if (typingTimer.current) clearTimeout(typingTimer.current);
  }, []);

  const refreshStatus = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    const res = await api<{ status: Session["status"]; position: number | null }>(`/api/w/${widget.id}/session?guestId=${encodeURIComponent(s.guestId)}`);
    if (res.ok) setSession((cur) => (cur ? { ...cur, status: res.data.status, position: res.data.position } : cur));
  }, [widget.id]);

  const upsert = useCallback((incoming: ChatMessage[]) => {
    setMessages((cur) => {
      const byId = new Map(cur.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      return [...byId.values()];
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const storageKey = `ba_guest_${widget.id}`;

    (async () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(storageKey);
      } catch {
        /* storage blocked (private mode / third-party iframe): new guest each visit */
      }
      const res = await api<Session>(`/api/w/${widget.id}/session`, {
        body: { guestId: stored ?? undefined, lang: (navigator.language || "en").slice(0, 2) },
      });
      if (cancelled) return;
      if (!res.ok) {
        setPhase("error");
        setError(res.error);
        return;
      }
      const s = res.data;
      try {
        localStorage.setItem(storageKey, s.guestId);
      } catch {
        /* ignore */
      }

      const nc = await import("@nexconn/chat");
      if (cancelled) return;
      if (!engineReady) {
        nc.NCEngine.initialize({
          appKey: s.appKey,
          areaCode: s.areaCode, // numeric AreaCode from the server (SG=2, NA=3, SA=5)
          logLevel: process.env.NODE_ENV === "production" ? nc.LogLevel.WARN : nc.LogLevel.DEBUG,
        });
        engineReady = true;
      }

      nc.NCEngine.addConnectionStatusHandler(
        HANDLER_ID,
        new nc.ConnectionStatusHandler({
          onConnectionStatusChanged({ status }) {
            if (status === nc.ConnectionStatus.CONNECTED) setPhase("ready");
            else if (status === nc.ConnectionStatus.CONNECTING || status === nc.ConnectionStatus.SUSPENDED) setPhase("offline");
          },
        }),
      );
      nc.NCEngine.addMessageHandler(
        HANDLER_ID,
        new nc.MessageHandler({
          onMessageReceived({ messages: list }) {
            const mine = list.filter((m) => m.channelIdentifier?.channelId === s.groupId);
            const mapped = mine.map((m) => ({ id: m.messageId, role: roleOf(m.senderUserId), text: textOf(m) })).filter((m) => m.text);
            if (!mapped.length) return;
            upsert(mapped);
            if (mapped.some((m) => m.role !== "buyer")) {
              stopTyping();
              void refreshStatus();
            }
          },
        }),
      );

      const conn = await nc.NCEngine.connect({ token: s.token });
      if (cancelled) return;
      if (!conn.isOk) {
        setPhase("error");
        setError("We couldn't connect the chat. Refresh to try again.");
        return;
      }
      setSession(s);
      setPhase("ready");

      const query = nc.BaseChannel.createMessagesQuery({
        channelIdentifier: new nc.GroupChannelIdentifier(s.groupId),
        isAscending: false,
        pageSize: 50,
      });
      const page = await query.loadNextPage();
      if (cancelled || !page.isOk) return;
      const history = (page.data?.data ?? [])
        .slice()
        .sort((a, b) => a.sentTime - b.sentTime)
        .map((m) => ({ id: m.messageId, role: roleOf(m.senderUserId), text: textOf(m) }))
        .filter((m) => m.text);
      upsert(history);
    })().catch((err) => {
      console.error("[buyer-chat] start failed", err);
      if (!cancelled) {
        setPhase("error");
        setError("We couldn't start the chat. Refresh to try again.");
      }
    });

    return () => {
      cancelled = true;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      void import("@nexconn/chat").then((nc) => {
        nc.NCEngine.removeMessageHandler(HANDLER_ID);
        nc.NCEngine.removeConnectionStatusHandler(HANDLER_ID);
        void nc.NCEngine.disconnect();
      });
    };
  }, [widget.id, upsert, stopTyping, refreshStatus]);

  async function send(text: string) {
    const s = sessionRef.current;
    if (!s) return;
    const tempId = `tmp-${crypto.randomUUID()}`;
    upsert([{ id: tempId, role: "buyer", text, pending: true }]);
    const nc = await import("@nexconn/chat");
    const res = await new nc.GroupChannel(s.groupId).sendMessage(new nc.SendTextMessageParams({ text }));
    setMessages((cur) => {
      const rest = cur.filter((m) => m.id !== tempId);
      if (!res.isOk || !res.data) return [...rest, { id: tempId, role: "buyer", text, failed: true }];
      return rest.some((m) => m.id === res.data!.messageId) ? rest : [...rest, { id: res.data.messageId, role: "buyer", text }];
    });
    if (res.isOk && s.status === "bot") {
      setTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), TYPING_TIMEOUT_MS);
    }
  }

  // Safety net: status changes normally arrive with a bot note; poll slowly while a person is involved.
  const humanPhase = session?.status === "waiting" || session?.status === "agent";
  useEffect(() => {
    if (!humanPhase) return;
    const t = setInterval(refreshStatus, 10_000);
    return () => clearInterval(t);
  }, [humanPhase, refreshStatus]);

  const closed = session?.status === "closed";
  const view = (
    <ChatView
      title={widget.title || widget.business_name}
      avatar={widget.avatar}
      accent={widget.color}
      status={statusLine(session, phase)}
      greeting={widget.greeting}
      messages={messages}
      typing={typing}
      onSend={send}
      disabled={phase !== "ready" || closed}
      placeholder={closed ? "This conversation is closed" : "Write a message"}
      notice={
        error ? (
          <p className="t-caption mx-3 mb-2 rounded-md bg-danger/8 px-3 py-2 text-danger" role="alert">
            {error}
          </p>
        ) : closed && session ? (
          <RatingBar widgetId={widget.id} guestId={session.guestId} accent={widget.color} />
        ) : null
      }
      onClose={embed ? () => window.parent.postMessage({ type: "bizzassist:close" }, "*") : undefined}
      className={cn(!embed && "md:overflow-hidden md:rounded-[20px] md:border md:border-hairline md:shadow-[0_24px_48px_-16px_rgb(0_0_0/0.18)]")}
    />
  );

  if (embed) return <div className="h-dvh">{view}</div>;
  return (
    <main className="flex h-dvh justify-center bg-canvas md:items-center md:bg-[#efeff1] md:py-8">
      <div className="h-full w-full md:h-[min(760px,100%)] md:max-w-[420px]">{view}</div>
    </main>
  );
}

/** After close: 1–5 pill chips; the selected one fills with the accent, then "Thanks". */
function RatingBar({ widgetId, guestId, accent }: { widgetId: string; guestId: string; accent: string }) {
  const [rating, setRating] = useState<number | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rate(n: number) {
    setRating(n);
    setError(null);
    const res = await api(`/api/w/${widgetId}/rate`, { body: { guestId, rating: n } });
    if (res.ok || res.status === 409) setSent(true);
    else setError(res.error);
  }

  return (
    <div className="bubble-in mx-3 mb-3 flex flex-col items-center gap-3 rounded-[14px] border border-hairline bg-canvas px-4 py-4 text-center shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      {sent ? (
        <>
          <p className="t-caption-strong" role="status">
            Thanks for your feedback!
          </p>
          <button type="button" onClick={() => window.location.reload()} className="t-caption min-h-11 text-primary hover:underline">
            Start a new chat
          </button>
        </>
      ) : (
        <>
          <p className="t-caption-strong" id="rate-label">
            How did we do?
          </p>
          <div role="radiogroup" aria-labelledby="rate-label" className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} out of 5`}
                onClick={() => rate(n)}
                className="press flex size-11 items-center justify-center rounded-[10px] border border-hairline bg-canvas t-body-strong tabular-nums hover:border-[var(--accent)] hover:text-[var(--accent)]"
                style={rating === n ? { background: accent, color: onAccent(accent), borderColor: accent } : undefined}
              >
                {n}
              </button>
            ))}
          </div>
          {error && <p className="t-fine text-danger">{error}</p>}
        </>
      )}
    </div>
  );
}
