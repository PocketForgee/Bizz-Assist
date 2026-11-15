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
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-hairline px-4">
        <span className="relative shrink-0">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-10 rounded-full object-cover" />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full text-[15px] font-medium" style={{ background: accent, color: fg }} aria-hidden>
              {title.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-canvas bg-success" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-ink">{title}</p>
          <p className="t-fine truncate text-ink-48" aria-live="polite">
            {status}
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close chat" className="press -mr-1 flex size-9 items-center justify-center rounded-md text-ink-48 hover:bg-parchment hover:text-ink">
            <X size={18} aria-hidden />
          </button>
        )}
      </header>

      <div ref={listRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-pearl px-4 py-5" role="log" aria-live="polite" aria-label="Messages">
        {greeting && <Bubble mine={false} head text={greeting} accent={accent} fg={fg} />}
        {messages.map((m, i) => {
          const prev = i === 0 ? (greeting ? "bot" : null) : messages[i - 1].role;
          return <Bubble key={m.id} head={prev !== m.role} mine={m.role === "buyer"} agent={m.role === "agent"} text={m.text} accent={accent} fg={fg} pending={m.pending} failed={m.failed} />;
        })}
        {typing && (
          <div className="bubble-in mt-3 flex w-fit items-center gap-1 rounded-[16px] rounded-tl-[4px] border border-hairline bg-canvas px-4 py-3" aria-label="Assistant is typing">
            <span className="typing-dot size-1.5 rounded-full bg-ink-48" />
            <span className="typing-dot size-1.5 rounded-full bg-ink-48" />
            <span className="typing-dot size-1.5 rounded-full bg-ink-48" />
          </div>
        )}
      </div>

      {notice}

      <div className="shrink-0 border-t border-hairline bg-canvas px-3 pt-3 pb-2">
        <form
          onSubmit={submit}
          className="flex items-end gap-2 rounded-[16px] border border-hairline bg-pearl p-1.5 pl-4 transition-[border-color,box-shadow] focus-within:border-[var(--accent)] focus-within:bg-canvas"
        >
          <label className="sr-only" htmlFor="chat-input">
            Message
          </label>
          <textarea
            id="chat-input"
            rows={Math.min(5, Math.max(1, draft.split("\n").length))}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
            }}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={2000}
            dir="auto"
            className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[16px] leading-6 text-ink placeholder:text-ink-48 focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={disabled || !draft.trim()}
            className="press flex size-9 shrink-0 items-center justify-center rounded-[11px] disabled:opacity-30"
            style={{ background: accent, color: fg }}
          >
            <ArrowUp size={18} aria-hidden />
          </button>
        </form>
        <p className="t-fine mt-2 text-center text-ink-48">
          Answers come from this shop&apos;s own information · <a href="/" target="_blank" rel="noreferrer" className="hover:text-ink">BizzAssist</a>
        </p>
      </div>
    </div>
  );
}

function Bubble({
  mine,
  agent,
  head,
  text,
  accent,
  fg,
  pending,
  failed,
}: {
  mine: boolean;
  agent?: boolean;
  head?: boolean;
  text: string;
  accent: string;
  fg: string;
  pending?: boolean;
  failed?: boolean;
}) {
  return (
    <div className={cn("bubble-in flex max-w-[84%] flex-col", mine ? "self-end items-end" : "self-start items-start", head ? "mt-3 first:mt-0" : "mt-1")}>
      {agent && head && <span className="t-fine mb-1 px-1 text-ink-48">Support team</span>}
      <p
        dir="auto"
        className={cn(
          "whitespace-pre-wrap break-words rounded-[16px] px-3.5 py-2 text-[15px] leading-[1.45]",
          mine ? head && "rounded-tr-[4px]" : cn("border border-hairline bg-canvas text-ink", head && "rounded-tl-[4px]"),
          agent && "border-transparent bg-ink text-white",
          pending && "opacity-60",
        )}
        style={mine ? { background: accent, color: fg } : undefined}
      >
        {text}
      </p>
      {failed && <span className="t-fine mt-1 text-danger">Not sent. Check your connection.</span>}
    </div>
  );
}
