"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowUp, X } from "lucide-react";
import { cn } from "@/components/ui";

export type ChatMessage = { id: string; role: "buyer" | "bot" | "agent"; text: string; pending?: boolean; failed?: boolean };

/** Readable text colour on the business accent (WCAG relative luminance). */
export function onAccent(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "var(--canvas)";
  const n = parseInt(m[1], 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.45 ? "var(--ink)" : "var(--canvas)";
}

/** The buyer chat surface. Used live on /w/[id] and as the static preview in the widget editor. */
export function ChatView({
  title,
  avatar,
  accent,
  status,
  greeting,
  messages,
  typing,
  onSend,
  disabled,
  placeholder = "Write a message",
  notice,
  onClose,
  className,
}: {
  title: string;
  avatar?: string | null;
  accent: string;
  status: string;
  greeting?: string;
  messages: ChatMessage[];
  typing?: boolean;
  onSend?: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  notice?: ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const fg = onAccent(accent);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, typing]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || disabled || !onSend) return;
    onSend(text.slice(0, 2000));
    setDraft("");
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-canvas", className)} style={{ ["--accent" as string]: accent }}>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline px-4">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="size-9 rounded-full object-cover" />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full t-caption-strong" style={{ background: accent, color: fg }} aria-hidden>
            {title.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="t-body-strong truncate">{title}</p>
          <p className="t-fine truncate text-ink-48" aria-live="polite">
            {status}
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close chat" className="press -mr-2 flex size-11 items-center justify-center rounded-full text-ink-48 hover:bg-parchment hover:text-ink">
            <X size={20} aria-hidden />
          </button>
        )}
      </header>

      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-4" role="log" aria-live="polite" aria-label="Messages">
        {greeting && <Bubble mine={false} text={greeting} accent={accent} fg={fg} />}
        {messages.map((m) => (
          <Bubble key={m.id} mine={m.role === "buyer"} agent={m.role === "agent"} text={m.text} accent={accent} fg={fg} pending={m.pending} failed={m.failed} />
        ))}
        {typing && (
          <div className="bubble-in flex w-fit items-center gap-1 rounded-[18px] rounded-bl-md bg-parchment px-4 py-3" aria-label="Assistant is typing">
            <span className="typing-dot size-1.5 rounded-full bg-ink-48" />
            <span className="typing-dot size-1.5 rounded-full bg-ink-48" />
            <span className="typing-dot size-1.5 rounded-full bg-ink-48" />
          </div>
        )}
      </div>

      {notice}

      <form onSubmit={submit} className="flex shrink-0 items-end gap-2 border-t border-hairline p-3">
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <textarea
          id="chat-input"
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
          }}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={2000}
          dir="auto"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-[22px] border border-hairline bg-pearl px-4 py-2.5 text-[17px] focus:border-primary-focus focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={disabled || !draft.trim()}
          className="press flex size-11 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
          style={{ background: accent, color: fg }}
        >
          <ArrowUp size={20} aria-hidden />
        </button>
      </form>
    </div>
  );
}

function Bubble({ mine, agent, text, accent, fg, pending, failed }: { mine: boolean; agent?: boolean; text: string; accent: string; fg: string; pending?: boolean; failed?: boolean }) {
  return (
    <div className={cn("bubble-in flex max-w-[82%] flex-col", mine ? "self-end items-end" : "self-start items-start")}>
      {agent && <span className="t-fine mb-0.5 text-ink-48">Support team</span>}
      <p
        dir="auto"
        className={cn("whitespace-pre-wrap break-words rounded-[18px] px-3.5 py-2 text-[16px] leading-snug", mine ? "rounded-br-md" : "rounded-bl-md bg-parchment text-ink", pending && "opacity-60")}
        style={mine ? { background: accent, color: fg } : undefined}
      >
        {text}
      </p>
      {failed && <span className="t-fine mt-0.5 text-danger">Not sent. Check your connection.</span>}
    </div>
  );
}
