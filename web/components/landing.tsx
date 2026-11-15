"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { ChatTextIcon, CheckIcon, FileTextIcon, GlobeIcon, SparkleIcon, TableIcon, TranslateIcon } from "@phosphor-icons/react";
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
      <div className="overflow-hidden rounded-3xl border border-paper-ink/10 bg-white shadow-[var(--shadow-product)]">
        <div className="flex h-16 items-center gap-3 border-b border-paper-ink/[0.06] px-4">
          <span className="title-4 relative flex size-10 items-center justify-center rounded-full bg-sienna-ink text-white">
            L<span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white bg-success" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="title-3 text-ink">Lumen &amp; Loom</p>
            <p className="caption-5 text-ink-48">Usually answers in seconds</p>
          </div>
        </div>
        <div className="play body-6 flex flex-col gap-1 bg-pearl px-4 py-6">
          <p style={t(300)} className="max-w-[80%] self-end rounded-2xl rounded-tr-sm bg-sienna-ink px-3 py-2 text-white">
            Where is my order LL&#8209;1002? It&apos;s arjun@example.com
          </p>
          <div style={t(1100)} className="mt-3 flex max-w-[86%] flex-col items-start gap-2 self-start">
            <p className="rounded-2xl rounded-tl-sm border border-paper-ink/[0.08] bg-white px-3 py-2 text-ink">
              It has shipped with DHL, tracking JD0000000000000002. It should reach you on 18 Nov.
            </p>
            <span className="flex gap-2 text-ink-48">
              <Slip>S1 Order lookup</Slip>
              <Slip>S2 Shipping policy</Slip>
            </span>
          </div>
          <p style={t(2300)} className="mt-3 max-w-[80%] self-end rounded-2xl rounded-tr-sm bg-sienna-ink px-3 py-2 text-white">
            Can I return a cushion cover I&apos;ve used?
          </p>
          <div style={t(3200)} className="caption-5 my-3 flex items-center gap-2 self-center text-ink-48">
            <span className="h-px w-6 bg-paper-ink/10" />
            Priya from the team joined
            <span className="h-px w-6 bg-paper-ink/10" />
          </div>
          <div style={t(4000)} className="flex max-w-[86%] flex-col items-start self-start">
            <span className="caption-5 mb-1 px-1 text-ink-48">Support team</span>
            <p className="rounded-2xl rounded-tl-sm bg-ink px-3 py-2 text-white">Yes, within 30 days if it&apos;s faulty. Send a photo and we&apos;ll sort it.</p>
          </div>
        </div>
      </div>

      {/* the learned slip: the moment the page is about */}
      <div style={t(5200)} className="play absolute -bottom-10 left-0 w-[min(260px,85%)] sm:-left-16">
        <div className="rotate-[-2deg] rounded-xl border border-dashed border-paper-ink/35 bg-saffron p-3 shadow-[0_12px_24px_-12px_rgb(38_70_83/0.4)]">
          <div className="caption-4 flex items-center justify-between text-paper-ink">
            <span>Learned from Priya</span>
            <Slip>Q&amp;A 08</Slip>
          </div>
          <p className="body-6 mt-2 text-paper-ink">Used items can be returned within 30 days when faulty, with a photo.</p>
        </div>
      </div>
    </div>
  );
}

const SOURCES = [
  { icon: GlobeIcon, name: "Website", note: "Your pages or sitemap. The homepage and policy pages are read when you sign up.", status: "42 pages" },
  { icon: FileTextIcon, name: "Documents", note: "PDFs, text files or pasted text, like a returns policy or a size guide.", status: "3 files" },
  { icon: ChatTextIcon, name: "Q&A", note: "Exact answers, with other ways customers ask the same thing.", status: "18 answers" },
  { icon: TableIcon, name: "Order lookups", note: "A REST endpoint or a Google Sheet. It needs the order number and the buyer's email.", status: "1 action" },
  { icon: SparkleIcon, name: "Learned answers", note: "What your team said in chats handed over to them, approved by you.", status: "7 approved" },
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
                "press flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left",
                on === i ? "bg-white shadow-[0_1px_2px_rgb(38_70_83/0.05),0_0_0_1px_rgb(38_70_83/0.08)]" : "hover:bg-paper-raised/60",
              )}
            >
              <s.icon size={20} className={cn("mt-0.5 shrink-0 transition-colors duration-300", on === i ? "text-primary" : "text-paper-ink-2")} aria-hidden />
              <span>
                <span className="title-3 block text-paper-ink">{s.name}</span>
                <span className={cn("body-6 mt-1 block text-paper-ink-2", on !== i && "max-lg:hidden")}>{s.note}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="overflow-hidden rounded-2xl border border-paper-ink/10 bg-white shadow-[var(--shadow-product)]">
        <div className="flex h-12 items-center justify-between border-b border-paper-ink/[0.06] px-4">
          <span className="title-4 text-ink">Train</span>
          <span className="caption-5 text-ink-48">Lumen &amp; Loom</span>
        </div>
        <ul className="divide-y divide-paper-ink/[0.05]">
          {SOURCES.map((s, i) => (
            <li key={s.name} className={cn("flex h-14 items-center gap-3 px-4 transition-colors duration-300", on === i ? "bg-primary-soft/60" : "")}>
              <s.icon size={16} className={on === i ? "text-primary" : "text-ink-48"} aria-hidden />
              <span className="body-6 flex-1 text-ink">{s.name}</span>
              <span className="t-mono text-ink-48">{s.status}</span>
              <span className="caption-5 flex items-center gap-1 text-success">
                <CheckIcon size={14} aria-hidden /> Ready
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
    <div className="overflow-hidden rounded-2xl border border-paper-ink/10 bg-white shadow-[var(--shadow-product)]">
      <div className="grid sm:grid-cols-[220px_minmax(0,1fr)]">
        <div className="border-b border-paper-ink/[0.06] bg-pearl p-2 sm:border-r sm:border-b-0">
          <div className="caption-4 mb-2 flex gap-1 rounded-lg bg-paper-ink/[0.05] p-0.5">
            <span className="flex-1 rounded-md bg-white py-1 text-center shadow-[0_1px_2px_rgb(38_70_83/0.08)]">Waiting 2</span>
            <span className="flex-1 py-1 text-center text-ink-48">Mine</span>
          </div>
          {[
            { n: "Customer 7F2A", w: "1m 12s", l: "ES", x: "Return of a used cushion cover" },
            { n: "Customer 03BD", w: "0m 31s", l: "HI", x: "Wants a bulk order invoice" },
          ].map((r, i) => (
            <div key={r.n} className={cn("rounded-lg px-3 py-2", i === 0 && "bg-white shadow-[0_0_0_1px_rgb(38_70_83/0.06)]")}>
              <p className="title-5 flex items-center gap-2 text-ink">
                <span className="live-dot text-sand" />
                <span className="flex-1">{r.n}</span>
                <span className="t-mono text-warning">{r.w}</span>
              </p>
              <p className="caption-5 mt-1 text-ink-80">{r.x}</p>
              <p className="t-mono mt-1 text-ink-48">{r.l}</p>
            </div>
          ))}
        </div>
        <div className="p-6">
          <p className="caption-5 text-ink-48">Summary from the assistant</p>
          <dl className="caption-2 mt-3 flex flex-col gap-3">
            <div>
              <dt className="text-ink-48">Issue</dt>
              <dd className="text-ink">Wants to return a cushion cover she has used</dd>
            </div>
            <div>
              <dt className="text-ink-48">What the assistant tried</dt>
              <dd className="text-ink">Quoted the 30 day policy; it doesn&apos;t cover used items</dd>
            </div>
            <div>
              <dt className="text-ink-48">Customer details</dt>
              <dd className="text-ink">Order LL&#8209;1004, writes in Spanish</dd>
            </div>
          </dl>
          <div className="mt-6 rounded-lg border border-dashed border-paper-ink/15 px-3 py-2">
            <p className="caption-5 flex items-center gap-1 text-ink-48">
              <TranslateIcon size={12} aria-hidden /> Translated for you
            </p>
            <p className="caption-2 mt-0.5 text-ink-80">Can I return a cushion cover I&apos;ve already used?</p>
          </div>
          <span className="button-sm mt-6 inline-flex items-center rounded-lg bg-primary px-3 py-2 text-white">Claim chat</span>
        </div>
      </div>
    </div>
  );
}

const STAGES = [
  { label: "Ask", line: "A customer asks something the assistant hasn't been taught.", who: "Customer", text: "¿Puedo devolver una funda de cojín que ya usé?" },
  { label: "Hand over", line: "It says so, and passes the chat to your team with a summary of what happened so far.", who: "Assistant", text: "I'll get someone from the team for this. They'll be with you shortly." },
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
              <button
                type="button"
                onClick={() => setI(n)}
                aria-pressed={n === i}
                className={cn("press w-full rounded-lg text-left transition-colors duration-300", n === i ? "text-paper-ink" : "text-paper-ink-2 hover:text-paper-ink")}
              >
                <span className="t-mono block">0{n + 1}</span>
                <span className="title-4 mt-1 block sm:title-3">{st.label}</span>
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
        <p key={i} className="enter-one title-2 mt-6 min-h-[84px] text-paper-ink">
          {s.line}
        </p>
      </div>
      <div className="rounded-2xl border border-paper-ink/10 bg-white p-6 shadow-[var(--shadow-product)]">
        <div key={i} className="bubble-in">
          <p className="caption-5 flex items-center gap-2 text-ink-48">
            {s.who === "Assistant" && <Mark size={12} />}
            {s.who}
          </p>
          <p
            className={cn(
              "body-3 mt-2 w-fit max-w-full rounded-2xl rounded-tl-sm px-4 py-2",
              s.who === "Customer" ? "border border-paper-ink/[0.08]" : s.who === "Support team" ? "bg-ink text-white" : "bg-parchment",
            )}
          >
            {s.text}
          </p>
          {i === 3 && (
            <span className="mt-3 flex gap-2 text-ink-48">
              <span className="slip text-primary">S1 Learned · Q&amp;A 08</span>
            </span>
          )}
          {i === 2 && (
            <p className="caption-2 mt-3 text-ink-48">
              The customer reads: <span className="text-ink-80">Sí, en 30 días si está defectuosa. Envíanos una foto.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** The Android agent app, as a phone width fragment. */
export function PhoneFragment() {
  return (
    <div className="mx-auto w-[260px] rounded-4xl border border-paper-ink/15 bg-black-ink p-2 shadow-[var(--shadow-product)]">
      <div className="overflow-hidden rounded-3xl bg-pearl">
        <div className="caption-4 flex h-12 items-end justify-between px-6 pb-1 text-ink">
          <span>9:41</span>
          <span className="h-1.5 w-12 rounded-full bg-ink/80" />
        </div>
        <div className="px-4 pt-3 pb-6">
          <p className="title-1 text-ink">Chats</p>
          <div className="caption-4 mt-3 flex gap-1 rounded-lg bg-paper-ink/[0.05] p-0.5">
            <span className="flex-1 rounded-md bg-white py-1 text-center shadow-[0_1px_2px_rgb(38_70_83/0.08)]">Waiting 2</span>
            <span className="flex-1 py-1 text-center text-ink-48">Mine</span>
          </div>
          {["Return of a used cushion cover", "Bulk order invoice"].map((x, n) => (
            <div key={x} className="mt-3 rounded-xl bg-white p-3 shadow-[0_0_0_1px_rgb(38_70_83/0.05)]">
              <p className="caption-5 flex items-center gap-2 text-ink-48">
                <span className="live-dot text-sand" />
                <span className="t-mono">{n ? "HI" : "ES"}</span>
                <span className="t-mono ml-auto text-warning">{n ? "0:31" : "1:12"}</span>
              </p>
              <p className="title-5 mt-2 text-ink">{x}</p>
              <span className="button-xsm mt-3 flex h-8 items-center justify-center rounded-lg bg-primary text-white">Claim chat</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
