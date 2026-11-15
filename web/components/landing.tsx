"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Check, FileText, Globe, Languages, MessageSquareText, Sheet as SheetIcon, Sparkles } from "lucide-react";
import { Mark } from "@/components/brand";
import { cn } from "@/components/ui";

/* Product fragments for the landing page. Each is a piece of the real app with plausible data, drawn in HTML. */

const t = (ms: number) => ({ "--t": ms }) as CSSProperties;

function Slip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("slip", className)}>{children}</span>;
}

/** Hero: the shop's chat widget, playing one conversation that shows the whole product. */
export function HeroChat() {
  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      <div className="overflow-hidden rounded-[22px] border border-paper-ink/10 bg-white shadow-[var(--shadow-product)]">
        <div className="flex h-16 items-center gap-3 border-b border-black/[0.06] px-4">
          <span className="relative flex size-10 items-center justify-center rounded-full bg-[#7a4b2a] text-[15px] font-medium text-white">
            L<span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white bg-success" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-ink">Lumen &amp; Loom</p>
            <p className="t-fine text-ink-48">Usually answers in seconds</p>
          </div>
        </div>
        <div className="play flex flex-col gap-1 bg-pearl px-4 py-5 text-[14px] leading-[1.45]">
          <p style={t(300)} className="max-w-[80%] self-end rounded-[16px] rounded-tr-[4px] bg-[#7a4b2a] px-3.5 py-2 text-white">
            Where is my order LL-1002? It&apos;s arjun@example.com
          </p>
          <div style={t(1100)} className="mt-3 flex max-w-[86%] flex-col items-start gap-1.5 self-start">
            <p className="rounded-[16px] rounded-tl-[4px] border border-black/[0.07] bg-white px-3.5 py-2 text-ink">
              It shipped on 12 Nov with DHL, tracking 7731 0042 85. It should reach you on 18 Nov.
            </p>
            <span className="flex gap-1.5 text-ink-48">
              <Slip>S1 Order lookup</Slip>
              <Slip>S2 Shipping policy</Slip>
            </span>
          </div>
          <p style={t(2300)} className="mt-3 max-w-[80%] self-end rounded-[16px] rounded-tr-[4px] bg-[#7a4b2a] px-3.5 py-2 text-white">
            Can I return a cushion cover I&apos;ve used?
          </p>
          <div style={t(3200)} className="my-3 flex items-center gap-2 self-center text-[12px] text-ink-48">
            <span className="h-px w-6 bg-black/10" />
            Priya from the team joined
            <span className="h-px w-6 bg-black/10" />
          </div>
          <div style={t(4000)} className="flex max-w-[86%] flex-col items-start self-start">
            <span className="t-fine mb-1 px-1 text-ink-48">Support team</span>
            <p className="rounded-[16px] rounded-tl-[4px] bg-ink px-3.5 py-2 text-white">Yes, within 30 days if it&apos;s faulty. Send a photo and we&apos;ll sort it.</p>
          </div>
        </div>
      </div>

      {/* the learned slip: the moment the page is about */}
      <div style={t(5200)} className="play absolute -bottom-10 -left-4 w-[260px] sm:-left-16">
        <div className="rotate-[-2deg] rounded-[12px] border border-dashed border-paper-ink/30 bg-paper p-3.5 shadow-[0_12px_24px_-12px_rgb(31_27_22/0.35)]">
          <div className="flex items-center justify-between text-[12px] text-paper-ink-2">
            <span>Learned from Priya</span>
            <Slip className="text-primary">Q&amp;A 08</Slip>
          </div>
          <p className="mt-1.5 text-[13px] leading-snug text-paper-ink">Used items can be returned within 30 days when faulty, with a photo.</p>
        </div>
      </div>
    </div>
  );
}

const SOURCES = [
  { icon: Globe, name: "Website", note: "Your pages or sitemap. The homepage and policy pages are read when you sign up.", status: "42 pages" },
  { icon: FileText, name: "Documents", note: "PDFs, text files or pasted text, like a returns policy or a size guide.", status: "3 files" },
  { icon: MessageSquareText, name: "Q&A", note: "Exact answers, with other ways customers ask the same thing.", status: "18 answers" },
  { icon: SheetIcon, name: "Order lookups", note: "A REST endpoint or a Google Sheet. It needs the order number and the buyer's email.", status: "1 action" },
  { icon: Sparkles, name: "Learned answers", note: "What your team said in handed-over chats, approved by you.", status: "7 approved" },
];

/** Five ways to teach it, as the Train screen lists them. */
export function SourcesFragment() {
  const [on, setOn] = useState(0);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
      <ul className="flex flex-col gap-1" role="tablist" aria-label="Sources">
        {SOURCES.map((s, i) => (
          <li key={s.name}>
            <button
              type="button"
              role="tab"
              aria-selected={on === i}
              onClick={() => setOn(i)}
              onMouseEnter={() => setOn(i)}
              className={cn(
                "press flex w-full items-start gap-3 rounded-[12px] px-4 py-3.5 text-left",
                on === i ? "bg-white shadow-[0_1px_2px_rgb(0_0_0/0.05),0_0_0_1px_rgb(31_27_22/0.08)]" : "hover:bg-paper-raised/60",
              )}
            >
              <s.icon size={18} strokeWidth={1.5} className={cn("mt-0.5 shrink-0", on === i ? "text-primary" : "text-paper-ink-2")} aria-hidden />
              <span>
                <span className="block text-[16px] font-medium text-paper-ink">{s.name}</span>
                <span className={cn("mt-1 block text-[14px] leading-relaxed text-paper-ink-2", on !== i && "max-lg:hidden")}>{s.note}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="overflow-hidden rounded-[16px] border border-paper-ink/10 bg-white shadow-[var(--shadow-product)]">
        <div className="flex h-12 items-center justify-between border-b border-black/[0.06] px-4">
          <span className="text-[14px] font-medium text-ink">Train</span>
          <span className="t-fine text-ink-48">Lumen &amp; Loom</span>
        </div>
        <ul className="divide-y divide-black/[0.05]">
          {SOURCES.map((s, i) => (
            <li key={s.name} className={cn("flex h-14 items-center gap-3 px-4 transition-colors duration-200", on === i ? "bg-primary-soft/60" : "")}>
              <s.icon size={16} strokeWidth={1.5} className={on === i ? "text-primary" : "text-ink-48"} aria-hidden />
              <span className="flex-1 text-[14px] text-ink">{s.name}</span>
              <span className="t-mono text-ink-48">{s.status}</span>
              <span className="flex items-center gap-1 text-[12px] text-success">
                <Check size={14} aria-hidden /> Ready
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** The agent inbox: queue with live wait timers and the summary the assistant writes on handover. */
export function InboxFragment() {
  return (
    <div className="overflow-hidden rounded-[16px] border border-paper-ink/10 bg-white shadow-[var(--shadow-product)]">
      <div className="grid sm:grid-cols-[220px_minmax(0,1fr)]">
        <div className="border-b border-black/[0.06] bg-pearl p-2 sm:border-r sm:border-b-0">
          <div className="mb-2 flex gap-1 rounded-[8px] bg-black/[0.04] p-0.5 text-[12px] font-medium">
            <span className="flex-1 rounded-[6px] bg-white py-1 text-center shadow-[0_1px_2px_rgb(0_0_0/0.08)]">Waiting 2</span>
            <span className="flex-1 py-1 text-center text-ink-48">Mine</span>
          </div>
          {[
            { n: "Customer 7F2A", w: "1m 12s", l: "ES", x: "Return of a used cushion cover" },
            { n: "Customer 03BD", w: "0m 31s", l: "HI", x: "Wants a bulk order invoice" },
          ].map((r, i) => (
            <div key={r.n} className={cn("rounded-[8px] px-3 py-2.5", i === 0 && "bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.06)]")}>
              <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
                <span className="live-dot text-warning" />
                <span className="flex-1">{r.n}</span>
                <span className="t-mono text-warning">{r.w}</span>
              </p>
              <p className="mt-1 text-[12px] text-ink-80">{r.x}</p>
              <p className="t-mono mt-1 text-ink-48">{r.l}</p>
            </div>
          ))}
        </div>
        <div className="p-5">
          <p className="t-fine text-ink-48">Summary from the assistant</p>
          <dl className="mt-3 flex flex-col gap-3 text-[13px]">
            <div>
              <dt className="text-ink-48">Issue</dt>
              <dd className="text-ink">Wants to return a cushion cover she has used</dd>
            </div>
            <div>
              <dt className="text-ink-48">What the assistant tried</dt>
              <dd className="text-ink">Quoted the 30-day policy; it doesn&apos;t cover used items</dd>
            </div>
            <div>
              <dt className="text-ink-48">Customer details</dt>
              <dd className="text-ink">Order LL-1004, writes in Spanish</dd>
            </div>
          </dl>
          <div className="mt-5 rounded-[10px] border border-dashed border-black/10 px-3 py-2">
            <p className="t-fine flex items-center gap-1.5 text-ink-48">
              <Languages size={12} aria-hidden /> Translated for you
            </p>
            <p className="mt-0.5 text-[13px] text-ink-80">Can I return a cushion cover I&apos;ve already used?</p>
          </div>
          <span className="mt-5 inline-flex h-9 items-center rounded-[10px] bg-primary px-4 text-[13px] font-medium text-white">Claim chat</span>
        </div>
      </div>
    </div>
  );
}

const STAGES = [
  { label: "Ask", line: "A customer asks something the assistant hasn't been taught.", who: "Customer", text: "¿Puedo devolver una funda de cojín que ya usé?" },
  { label: "Hand over", line: "It says so, and passes the chat to your team with a summary. The customer sees their place in line.", who: "Assistant", text: "I'll get someone from the team for this. You're first in line." },
  { label: "Answer", line: "Someone from your team answers, from the web inbox or the Android app. Each side reads the other in their own language.", who: "Support team", text: "Yes, within 30 days if it's faulty. Send a photo and we'll sort it." },
  { label: "Learn", line: "The answer becomes a suggested Q&A. You approve it, and the assistant answers it from the next chat on.", who: "Assistant", text: "Yes, used items can come back within 30 days if faulty. Send us a photo." },
];

/** The one live thing: drag through the learning loop. */
export function LoopSlider() {
  const [i, setI] = useState(0);
  const s = STAGES[i];
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
      <div>
        <ol className="grid grid-cols-4 gap-2">
          {STAGES.map((st, n) => (
            <li key={st.label}>
              <button type="button" onClick={() => setI(n)} className={cn("press w-full text-left", n === i ? "text-paper-ink" : "text-paper-ink-2 hover:text-paper-ink")}>
                <span className="t-mono block">0{n + 1}</span>
                <span className="mt-1 block text-[15px] font-medium">{st.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <label htmlFor="loop" className="sr-only">
          Step of the learning loop
        </label>
        <input
          id="loop"
          type="range"
          min={0}
          max={3}
          step={1}
          value={i}
          onChange={(e) => setI(Number(e.target.value))}
          className="stage-range mt-4"
          style={{ "--fill": `${(i / 3) * 100}%` } as CSSProperties}
          aria-valuetext={s.label}
        />
        <p key={i} className="route-in mt-6 min-h-[84px] text-[18px] leading-relaxed text-paper-ink">
          {s.line}
        </p>
      </div>
      <div className="rounded-[16px] border border-paper-ink/10 bg-white p-6 shadow-[var(--shadow-product)]">
        <div key={i} className="bubble-in">
          <p className="t-fine flex items-center gap-1.5 text-ink-48">
            {s.who === "Assistant" && <Mark size={12} />}
            {s.who}
          </p>
          <p className={cn("mt-2 w-fit max-w-full rounded-[16px] px-4 py-2.5 text-[15px]", s.who === "Customer" ? "rounded-tl-[4px] border border-black/[0.07]" : s.who === "Support team" ? "rounded-tl-[4px] bg-ink text-white" : "rounded-tl-[4px] bg-parchment")}>
            {s.text}
          </p>
          {i === 3 && (
            <span className="mt-3 flex gap-1.5 text-ink-48">
              <span className="slip text-primary">S1 Learned · Q&amp;A 08</span>
            </span>
          )}
          {i === 2 && (
            <p className="mt-3 text-[13px] text-ink-48">
              The customer reads: <span className="text-ink-80">Sí, en 30 días si está defectuosa. Envíanos una foto.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** The Android agent app, as a phone-width fragment. */
export function PhoneFragment() {
  return (
    <div className="mx-auto w-[260px] rounded-[38px] border border-paper-ink/15 bg-[#1b1a18] p-2.5 shadow-[var(--shadow-product)]">
      <div className="overflow-hidden rounded-[30px] bg-pearl">
        <div className="flex h-12 items-end justify-between px-5 pb-1 text-[11px] font-medium text-ink">
          <span>9:41</span>
          <span className="h-1.5 w-12 rounded-full bg-ink/80" />
        </div>
        <div className="px-4 pt-3 pb-5">
          <p className="text-[20px] font-medium text-ink">Chats</p>
          <div className="mt-3 flex gap-1 rounded-[10px] bg-black/[0.05] p-0.5 text-[12px] font-medium">
            <span className="flex-1 rounded-[8px] bg-white py-1.5 text-center shadow-[0_1px_2px_rgb(0_0_0/0.08)]">Waiting 2</span>
            <span className="flex-1 py-1.5 text-center text-ink-48">Mine</span>
          </div>
          {["Return of a used cushion cover", "Bulk order invoice"].map((x, n) => (
            <div key={x} className="mt-2.5 rounded-[14px] bg-white p-3 shadow-[0_0_0_1px_rgb(0_0_0/0.05)]">
              <p className="flex items-center gap-2 text-[12px] text-ink-48">
                <span className="live-dot text-warning" />
                <span className="t-mono">{n ? "HI" : "ES"}</span>
                <span className="t-mono ml-auto text-warning">{n ? "0:31" : "1:12"}</span>
              </p>
              <p className="mt-1.5 text-[13px] font-medium text-ink">{x}</p>
              <span className="mt-2.5 flex h-8 items-center justify-center rounded-[10px] bg-primary text-[12px] font-medium text-white">Claim chat</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
