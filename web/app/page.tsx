import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { PLAN_LABEL, PLAN_LIMITS, type Plan } from "@/lib/plans";
import { Mark, Wordmark } from "@/components/brand";
import { HeroChat, InboxFragment, LoopSlider, PhoneFragment, SourcesFragment } from "@/components/landing";

export const metadata: Metadata = {
  title: "BizzAssist: support chat that learns your shop",
  description: "Support chat for online shops. It answers from your website, documents and order data, hands hard chats to your team, and learns from every answer they give.",
};

// Idea: a shop's service counter. Every answer carries a slip saying where it came from, and every answer
// a person gives becomes a new slip the assistant can use. The slip is the page's one recurring shape.
const fmt = (n: number) => n.toLocaleString("en-US");
const i = (n: number) => ({ "--i": n }) as CSSProperties;

const PLANS: { plan: Plan; line: string; lead?: boolean }[] = [
  { plan: "free", line: "One widget and one person answering. Enough to see it work on your shop." },
  { plan: "pro", line: "For a shop with a small team and live order lookups.", lead: true },
  { plan: "business", line: "Several brands or sites, and a full support team." },
];

const ROWS: { key: keyof (typeof PLAN_LIMITS)["free"]; label: string }[] = [
  { key: "aiReplies", label: "AI replies a month" },
  { key: "widgets", label: "Widgets" },
  { key: "agents", label: "People answering" },
  { key: "qa", label: "Q&A answers" },
  { key: "pages", label: "Website pages" },
  { key: "actions", label: "Order lookups" },
];

export default function Home() {
  return (
    <div className="paper min-h-dvh">
      {/* ---------- navigation ---------- */}
      <header className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-6 md:h-20 md:px-10">
        <Wordmark className="text-paper-ink" />
        <nav aria-label="Main" className="flex items-center gap-1 text-[14px]">
          <a href="#how" className="hidden rounded-md px-3 py-2 text-paper-ink-2 hover:text-paper-ink md:block">
            How it works
          </a>
          <a href="#plans" className="hidden rounded-md px-3 py-2 text-paper-ink-2 hover:text-paper-ink md:block">
            Plans
          </a>
          <Link href="/login" className="rounded-md px-3 py-2 text-paper-ink-2 hover:text-paper-ink">
            Sign in
          </Link>
          <Link href="/signup" className="press ml-1 inline-flex h-9 items-center rounded-md bg-paper-ink px-4 font-medium text-paper hover:bg-black">
            Start free
          </Link>
        </nav>
      </header>

      {/* ---------- hero: the claim, and the product doing it ---------- */}
      <section className="mx-auto grid max-w-[1240px] items-center gap-16 px-6 pt-10 pb-28 md:px-10 lg:min-h-[calc(100svh-80px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:pt-0 lg:pb-16">
        <div className="route-in">
          <p className="t-mono flex items-center gap-2 text-paper-ink-2">
            <span className="slip text-primary">S1</span>
            Support chat for online shops
          </p>
          <h1 className="t-hero mt-6 text-paper-ink">
            Support that
            <br />
            learns your shop
          </h1>
          <p className="mt-6 max-w-[34rem] text-[18px] leading-[1.6] text-paper-ink-2">
            It answers your customers from your website, policies and order data. When it can&apos;t help, it hands the chat to your team, and every answer they give becomes
            something it knows.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="press inline-flex h-12 items-center gap-2 rounded-[10px] bg-primary px-5 text-[15px] font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14)] hover:bg-primary-focus">
              Start free <ArrowRight size={16} aria-hidden />
            </Link>
            <a href="#how" className="press inline-flex h-12 items-center rounded-[10px] px-5 text-[15px] text-paper-ink hover:bg-paper-raised">
              See how it learns
            </a>
          </div>
          <p className="t-fine mt-5 text-paper-ink-2">Free plan, no card. Set up in the time it takes to paste your website address.</p>
        </div>
        <div className="pb-8 lg:pb-0">
          <HeroChat />
        </div>
      </section>

      {/* ---------- 1. teach ---------- */}
      <section className="border-t border-paper-ink/10 bg-paper-raised/40">
        <div className="mx-auto max-w-[1240px] px-6 py-24 md:px-10 md:py-32">
          <div className="rise max-w-[40rem]" style={i(0)}>
            <p className="t-mono text-paper-ink-2">01 · Teach it</p>
            <h2 className="t-display mt-3 text-paper-ink">It only says what your shop has told it</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-paper-ink-2">
              Every answer cites its source. When nothing it was taught covers the question, it says so instead of guessing, and offers a person.
            </p>
          </div>
          <div className="rise mt-14" style={i(1)}>
            <SourcesFragment />
          </div>
        </div>
      </section>

      {/* ---------- 2. hand over ---------- */}
      <section className="border-t border-paper-ink/10">
        <div className="mx-auto grid max-w-[1240px] items-center gap-14 px-6 py-24 md:px-10 md:py-32 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="rise order-2 lg:order-1" style={i(1)}>
            <InboxFragment />
          </div>
          <div className="rise order-1 lg:order-2" style={i(0)}>
            <p className="t-mono text-paper-ink-2">02 · Hand over</p>
            <h2 className="t-display mt-3 text-paper-ink">Hard chats go to a person, already explained</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-paper-ink-2">
              Your team sees the issue, what the assistant tried and the customer&apos;s details before they say hello. They answer from the web inbox or the Android app, each side
              in their own language.
            </p>
            <div className="mt-10 hidden sm:block">
              <PhoneFragment />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 3. learn: the live thing ---------- */}
      <section id="how" className="scroll-mt-8 border-t border-paper-ink/10 bg-paper-raised/40">
        <div className="mx-auto max-w-[1240px] px-6 py-24 md:px-10 md:py-32">
          <div className="rise max-w-[40rem]" style={i(0)}>
            <p className="t-mono text-paper-ink-2">03 · Learn</p>
            <h2 className="t-display mt-3 text-paper-ink">Answered once, answered from then on</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-paper-ink-2">Drag through one question&apos;s life. Nothing reaches customers until you approve it.</p>
          </div>
          <div className="rise mt-14" style={i(1)}>
            <LoopSlider />
          </div>
        </div>
      </section>

      {/* ---------- plans ---------- */}
      <section id="plans" className="scroll-mt-8 border-t border-paper-ink/10">
        <div className="mx-auto max-w-[1240px] px-6 py-24 md:px-10 md:py-32">
          <div className="rise flex flex-wrap items-end justify-between gap-6" style={i(0)}>
            <div className="max-w-[36rem]">
              <p className="t-mono text-paper-ink-2">Plans</p>
              <h2 className="t-display mt-3 text-paper-ink">Start free. Grow when the chats do</h2>
            </div>
            <p className="max-w-[22rem] text-[14px] text-paper-ink-2">Every plan has the same assistant, handover, translation and learning. Plans differ in volume.</p>
          </div>
          <div className="rise mt-12 grid gap-4 md:grid-cols-3" style={i(1)}>
            {PLANS.map(({ plan, line, lead }) => (
              <div
                key={plan}
                className={
                  lead
                    ? "flex flex-col rounded-[16px] bg-paper-ink p-6 text-paper shadow-[var(--shadow-product)]"
                    : "flex flex-col rounded-[16px] border border-paper-ink/10 bg-white/70 p-6 text-paper-ink"
                }
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-[18px] font-medium">{PLAN_LABEL[plan]}</h3>
                  {lead && <span className="slip text-saffron">Most shops</span>}
                </div>
                <p className={lead ? "mt-2 min-h-[44px] text-[14px] text-paper/70" : "mt-2 min-h-[44px] text-[14px] text-paper-ink-2"}>{line}</p>
                <p className="t-figure mt-8">{fmt(PLAN_LIMITS[plan].aiReplies)}</p>
                <p className={lead ? "mt-1 text-[13px] text-paper/70" : "mt-1 text-[13px] text-paper-ink-2"}>AI replies a month</p>
                <dl className={lead ? "mt-6 divide-y divide-paper/10 border-t border-paper/10" : "mt-6 divide-y divide-paper-ink/10 border-t border-paper-ink/10"}>
                  {ROWS.slice(1).map((r) => (
                    <div key={r.key} className="flex h-10 items-center justify-between text-[14px]">
                      <dt className={lead ? "text-paper/70" : "text-paper-ink-2"}>{r.label}</dt>
                      <dd className="t-mono text-[13px]">{fmt(PLAN_LIMITS[plan][r.key])}</dd>
                    </div>
                  ))}
                </dl>
                <Link
                  href="/signup"
                  className={
                    lead
                      ? "press mt-8 inline-flex h-11 items-center justify-center rounded-[10px] bg-primary text-[14px] font-medium text-white hover:bg-primary-focus"
                      : "press mt-8 inline-flex h-11 items-center justify-center rounded-[10px] border border-paper-ink/15 bg-white text-[14px] font-medium text-paper-ink hover:bg-paper"
                  }
                >
                  Start free
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- close ---------- */}
      <section className="border-t border-paper-ink/10 bg-paper-ink text-paper">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-24 md:px-10 md:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-end">
          <h2 className="font-serif text-[44px] leading-[1.04] tracking-[-0.02em] md:text-[56px]">
            Paste your website.
            <br />
            <span className="text-paper/60">Answer your first customer today.</span>
          </h2>
          <form action="/signup" method="get" className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="cta-email" className="sr-only">
              Work email
            </label>
            <input
              id="cta-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@yourshop.com"
              className="h-12 flex-1 rounded-[10px] border border-paper/15 bg-white/5 px-4 text-[15px] text-paper placeholder:text-paper/40 focus:border-primary-on-dark focus:outline-none"
            />
            <button type="submit" className="press h-12 rounded-[10px] bg-paper px-5 text-[15px] font-medium text-paper-ink hover:bg-white">
              Start free
            </button>
          </form>
        </div>
        <footer className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 border-t border-paper/10 px-6 py-8 text-[13px] text-paper/60 md:px-10">
          <span className="flex items-center gap-2 text-paper">
            <Mark size={18} className="text-paper [--mark-cut:var(--paper-ink)]" />
            BizzAssist
          </span>
          <span>Built on Nexconn for the Nexconn Build Challenge 2026</span>
          <span className="flex gap-4">
            <Link href="/login" className="hover:text-paper">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-paper">
              Create an account
            </Link>
          </span>
        </footer>
      </section>
    </div>
  );
}
