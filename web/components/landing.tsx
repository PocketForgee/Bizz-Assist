"use client";

// Interactive parts of the marketing page (/). Every fragment marked data-ui is the real product's UI, drawn in HTML.
import { useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/components/ui";

/* ---------- shared bits ---------- */

/** The source chip every bot answer carries: the page's one motif. */
export function SourceChip({ n, label, dark }: { n: number; label: string; dark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px]", dark ? "bg-white/15 text-white" : "bg-primary/10 text-primary")}>
      <span className="font-semibold">S{n}</span> {label}
    </span>
  );
}

function Bubble({ who, children }: { who: "buyer" | "bot" | "agent"; children: ReactNode }) {
  return (
    <div className={cn("flex", who === "buyer" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-[18px] px-3.5 py-2 text-[15px] leading-snug",
          who === "buyer" ? "rounded-br-md bg-primary text-white" : who === "agent" ? "rounded-bl-md bg-ink text-white" : "rounded-bl-md bg-parchment text-ink",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* ---------- features: five training sources as switches ---------- */

const SOURCES = [
  { line: "Reads your website and sitemap", more: "Up to 300 pages on Pro. One click re-reads a page after you change it.", on: "#0058b0" },
  { line: "Learns from PDFs and pasted text", more: "Only the text is kept. The file itself is never stored.", on: "#1e7a35" },
  { line: "Uses your exact Q&A answers first", more: "Add the other ways customers ask, and it matches those too.", on: "#8a5a00" },
  { line: "Looks up live orders for you", more: "From your API or a Google Sheet, only with the order ID and the buyer's email or phone.", on: "#3a3a3c" },
  { line: "Turns agent replies into answers", more: "You approve each one before the bot uses it.", on: "#0058b0" },
];

export function SourceBands() {
  const [on, setOn] = useState<boolean[]>(SOURCES.map((_, i) => i === 0 || i === 4));
  return (
    <ul>
      {SOURCES.map((s, i) => (
        <li
          key={s.line}
          className="transition-colors duration-[240ms]"
          style={{ background: on[i] ? s.on : "transparent" }}
        >
          <div className="flex min-h-[132px] items-center gap-6 px-6 py-6 md:min-h-[20vh] md:px-10">
            <div className="min-w-0 flex-1">
              <p className={cn("text-[24px] font-semibold leading-tight tracking-[-0.02em] transition-colors md:text-[clamp(28px,2.6vw,36px)]", on[i] ? "text-white" : "text-white/60")}>{s.line}</p>
              {on[i] && <p className="bubble-in mt-2 max-w-[60ch] text-[15px] text-white md:text-[17px]">{s.more}</p>}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on[i]}
              aria-label={s.line}
              data-ui
              onClick={() => setOn((xs) => xs.map((x, j) => (j === i ? !x : x)))}
              className="press flex min-h-11 min-w-11 shrink-0 items-center justify-center"
            >
              <span className={cn("flex h-8 w-14 items-center rounded-full p-1 transition-colors", on[i] ? "bg-white" : "bg-white/25")}>
                <span className={cn("size-6 rounded-full transition-transform duration-[240ms]", on[i] ? "translate-x-6 bg-ink" : "bg-white")} />
              </span>
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- showcase: the Android agent app on a tall pill ---------- */

type Row = { lang: string; text: string; age: string; mine?: boolean };

function PhoneScreen({ view }: { view: number }) {
  const waiting: Row[] = [
    { lang: "HI", text: "Wants to change the delivery address", age: "now" },
    { lang: "ES", text: "Return for a used cushion cover", age: "2 min" },
    { lang: "EN", text: "Order LL-1003 still processing", age: "6 min" },
  ];
  return (
    <div data-ui className="flex h-full flex-col bg-parchment text-ink">
      <div className="flex items-center justify-between bg-canvas px-4 pb-3 pt-5">
        <p className="text-[17px] font-semibold">Lumen &amp; Loom</p>
        <span className="rounded-full bg-success/10 px-2 py-0.5 text-[13px] text-success">Online</span>
      </div>
      {view === 0 && (
        <>
          <div className="m-3 flex rounded-full bg-chip p-0.5 text-[13px]">
            <span className="flex-1 rounded-full bg-canvas py-1.5 text-center font-semibold">Waiting (3)</span>
            <span className="flex-1 py-1.5 text-center">Mine (1)</span>
          </div>
          <ul /* taste-skill-ignore: product list inside the data-ui fragment */ className="mx-3 divide-y divide-divider rounded-[18px] bg-canvas">
            {waiting.map((r) => (
              <li key={r.text} className="flex items-start gap-3 px-3 py-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-snug">{r.text}</p>
                  <p className="mt-0.5 text-[13px] text-ink-48">
                    {r.lang} · {r.age}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {view === 1 && (
        <div className="m-3 flex flex-col gap-3 rounded-[18px] bg-canvas p-4">
          <p className="text-[13px] text-ink-48">Summary from the bot</p>
          <p className="text-[15px] leading-snug">Buyer wants to change the delivery address on order LL-1002. Bot shared the change policy; the order has shipped.</p>
          <span className="mt-1 rounded-full bg-primary py-2.5 text-center text-[15px] font-semibold text-white">Claim chat</span>
        </div>
      )}
      {view === 2 && (
        <div className="m-3 flex flex-col gap-2 rounded-[18px] bg-canvas p-3">
          <Bubble who="buyer">¿Puedo devolver una funda de cojín usada?</Bubble>
          <p className="px-1 text-[13px] text-ink-48">Translated: Can I return a used cushion cover?</p>
          <Bubble who="agent">Yes, within 30 days if it is unused or faulty.</Bubble>
          <p className="px-1 text-right text-[13px] text-ink-48">Sent to the buyer in Spanish</p>
        </div>
      )}
      {view === 3 && (
        <div className="m-3 flex flex-col gap-2">
          <div className="rounded-[18px] bg-canvas p-3">
            <p className="text-[13px] text-ink-48">BizzAssist · now</p>
            <p className="mt-1 text-[15px] leading-snug">New chat waiting (HI): wants to change the delivery address</p>
          </div>
          <div className="rounded-[18px] bg-canvas p-3 opacity-80">
            <p className="text-[13px] text-ink-48">BizzAssist · 4 min</p>
            <p className="mt-1 text-[15px] leading-snug">New chat waiting (ES): return for a used cushion cover</p>
          </div>
        </div>
      )}
    </div>
  );
}

const APP_VIEWS = [
  { name: "Waiting chats", fact: "New chats arrive at the top, with the buyer's language and the bot's summary.", stage: "#0066cc" },
  { name: "One-tap claim", fact: "Only one agent can claim a chat. The others see it leave their queue.", stage: "#1e7a35" },
  { name: "Live translation", fact: "Buyer and agent each read the other in their own language.", stage: "#8a5a00" },
  { name: "Push alerts", fact: "Every agent is alerted when a chat is handed to a person.", stage: "#1d1d1f" },
];

export function AgentAppShowcase() {
  const [view, setView] = useState(0);
  const v = APP_VIEWS[view];
  return (
    <div className="grid items-end gap-10 md:grid-cols-12">
      <div className="order-2 md:order-1 md:col-span-4">
        <h2 id="app-heading" className="mb-4 text-[clamp(28px,2.9vw,44px)] font-semibold leading-[1.15] tracking-[-0.02em] text-ink-48">
          The agent app
        </h2>
        <ul className="flex gap-6 overflow-x-auto pb-2 md:flex-col md:gap-1 md:overflow-visible" aria-label="Agent app screens">
          {APP_VIEWS.map((x, i) => (
            <li key={x.name} className="shrink-0">
              <button
                type="button"
                aria-pressed={i === view}
                onClick={() => setView(i)}
                className={cn(
                  "min-h-11 text-left text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] transition-colors md:text-[clamp(28px,2.9vw,44px)]",
                  i === view ? "text-ink" : "text-ink-48 hover:text-ink-80",
                )}
              >
                {x.name}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-[40ch] text-[16px] text-ink md:hidden">{v.fact}</p>
      </div>
      <div className="relative order-1 flex justify-center md:order-2 md:col-span-6 md:col-start-6">
        {/* the tall pill: the source chip's shape at its largest */}
        <div className="h-[86vw] max-h-[560px] w-[52vw] max-w-[340px] rounded-full transition-colors duration-300 md:h-[64vh] md:max-h-[640px] md:w-[min(26vw,380px)]" style={{ background: v.stage }} />
        <div className="absolute -top-6 h-[calc(86vw_*_0.78_+_24px)] max-h-[460px] w-[44vw] max-w-[260px] overflow-hidden rounded-[32px] bg-canvas md:h-[calc(64vh_*_0.78_+_24px)] md:max-h-[520px] md:w-[min(20vw,290px)]">
          <div key={view} className="bubble-in h-full">
            <PhoneScreen view={view} />
          </div>
        </div>
      </div>
      <p className="order-3 hidden max-w-[24ch] text-[17px] text-ink md:col-span-2 md:block">{v.fact}</p>
    </div>
  );
}

/* ---------- how it works: one slider through the four stages ---------- */

const STAGES = [
  { short: "Ask", clause: "First, a buyer asks" },
  { short: "Hand over", clause: "Then the bot hands over" },
  { short: "Answer", clause: "An agent answers once" },
  { short: "Learn", clause: "Next time, the bot knows" },
];

function StageFragment({ stage }: { stage: number }) {
  return (
    <div data-ui className="w-full max-w-[440px] rounded-[18px] bg-canvas p-4">
      <div className="flex flex-col gap-2.5">
        <Bubble who="buyer">Can I return a cushion cover I already used?</Bubble>
        {stage >= 1 && (
          <>
            <Bubble who="bot">I&apos;m connecting you with a member of our team. You&apos;re next in line.</Bubble>
            <p className="self-center rounded-full bg-parchment px-3 py-1 text-[13px] text-ink-80">Waiting for a person</p>
          </>
        )}
        {stage === 2 && <Bubble who="agent">Yes. Used items can be returned within 30 days if they are faulty. Send us a photo and we&apos;ll arrange it.</Bubble>}
        {stage === 3 && (
          <div className="mt-1 rounded-[18px] bg-parchment p-3">
            <p className="text-[13px] text-ink-48">Suggested Q&amp;A from this chat</p>
            <p className="mt-1 text-[15px] font-semibold">Can I return a used item?</p>
            <p className="mt-0.5 text-[15px] text-ink-80">Within 30 days if it is faulty. Send a photo and we arrange it.</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-semibold text-white">Approve</span>
              <span className="text-[13px] text-success">Live on the next reply</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function StageSlider() {
  const [stage, setStage] = useState(0);
  const fill = `${(stage / (STAGES.length - 1)) * 100}%`;
  return (
    <div className="grid md:min-h-[88svh] md:grid-cols-2">
      <div className="order-2 flex flex-col bg-tile-1 px-6 py-10 text-white md:order-1 md:px-10 md:py-16">
        <h2 id="how-heading" className="sr-only">
          How it works
        </h2>
        <p key={stage} className="bubble-in text-[9vw] font-semibold leading-[1.02] tracking-[-0.03em] md:text-[clamp(40px,4.6vw,76px)]" aria-live="polite">
          {STAGES[stage].clause}
        </p>
      </div>
      <div className="order-1 flex min-h-[46svh] items-center justify-center bg-parchment px-4 py-10 md:order-2">
        <div key={stage} className="bubble-in flex w-full justify-center">
          <StageFragment stage={stage} />
        </div>
      </div>
      <div className="order-3 bg-parchment px-6 pb-10 pt-4 md:col-span-2 md:px-10">
        <input
          type="range"
          min={0}
          max={STAGES.length - 1}
          step={1}
          value={stage}
          onChange={(e) => setStage(Number(e.target.value))}
          aria-label="Stage"
          aria-valuetext={`${STAGES[stage].short}: ${STAGES[stage].clause}`}
          className="stage-range"
          style={{ "--fill": fill } as CSSProperties}
        />
        <ol className="mt-2 grid grid-cols-2 gap-2 text-[15px] md:grid-cols-4 md:text-[16px]">
          {STAGES.map((s, i) => (
            <li key={s.short} className={cn("md:text-center first:md:text-left last:md:text-right", i === stage ? "font-semibold text-ink" : "text-ink-48")}>
              <button type="button" className="min-h-11" onClick={() => setStage(i)}>
                {s.short}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
