import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PLAN_LABEL, PLAN_LIMITS, type Plan } from "@/lib/plans";
import { AgentAppShowcase, SourceBands, SourceChip, StageSlider } from "@/components/landing";

export const metadata: Metadata = {
  title: "BizzAssist: support chat that learns your shop",
  description: "AI customer support for online shops. Answers from your website, documents and Q&A, hands hard chats to your team, and learns from every reply.",
};

// Idea: the source chip ([S1]) every answer carries is the page's one shape. It is the hero stage's corner,
// the agent-app pill, the slider thumb, the plan tiles' ends and the footer blocks.
const fmt = (n: number) => n.toLocaleString("en-US");
const PLANS: { plan: Plan; h: string; bg: string; strip: string; ink: string; cta: string }[] = [
  { plan: "free", h: "md:h-[360px]", bg: "bg-parchment", strip: "bg-hairline", ink: "text-ink", cta: "Start free" },
  { plan: "pro", h: "md:h-[480px]", bg: "bg-primary", strip: "bg-[#0058b0]", ink: "text-white", cta: "Start free, then switch to Pro" },
  { plan: "business", h: "md:h-[600px]", bg: "bg-ink", strip: "bg-black", ink: "text-white", cta: "Start free, then switch to Business" },
];

const WORDMARK = "BizzAssist".split("");
const BLOCK_H = [100, 78, 88, 64, 92, 70, 84, 60, 96, 74];

export default function Home() {
  return (
    <div className="bg-canvas text-ink">
      {/* ---------- hero ---------- */}
      <section className="relative overflow-hidden md:min-h-[max(100svh,760px)]">
        <nav className="relative z-10 flex items-center justify-between px-6 pt-5 md:px-10 md:pt-7" aria-label="Main">
          <Link href="/" className="text-[19px] font-semibold tracking-[-0.02em]">
            BizzAssist
          </Link>
          <ul className="flex items-center gap-5 text-[15px] md:gap-8">
            <li className="hidden md:block">
              <a href="#how" className="text-ink-80 hover:text-ink">How it works</a>
            </li>
            <li className="hidden md:block">
              <a href="#app" className="text-ink-80 hover:text-ink">Agent app</a>
            </li>
            <li className="hidden md:block">
              <a href="#plans" className="text-ink-80 hover:text-ink">Plans</a>
            </li>
            <li>
              <Link href="/login" className="flex min-h-11 items-center text-primary hover:underline">Sign in</Link>
            </li>
          </ul>
        </nav>

        <div className="relative z-10 px-6 pt-12 md:px-10 md:pt-[110px]">
          <h1 className="text-[10vw] font-semibold leading-[1.02] tracking-[-0.03em] md:text-[clamp(52px,5.2vw,80px)]">
            Support that
            <br />
            learns your shop
          </h1>
          <p className="mt-8 max-w-[40ch] text-[16px] leading-normal text-ink md:mt-10 md:max-w-[34ch] md:text-[18px]">
            BizzAssist answers your customers from your website, documents and Q&amp;A, in their language. Hard chats go to your team, and every reply they write teaches the bot.
          </p>
          <Link href="/signup" className="press mt-8 inline-flex min-h-11 items-center rounded-full bg-primary px-[22px] text-[17px] font-semibold text-white hover:bg-primary-focus">
            Start free
          </Link>
        </div>

        {/* stage: flat accent field, its top-left corner is the source chip's round end */}
        <div className="shutter relative mt-12 ml-0 h-[560px] overflow-hidden rounded-tl-[72px] bg-primary md:absolute md:bottom-0 md:left-[36%] md:right-0 md:top-[42%] md:mt-0 md:h-auto md:rounded-tl-[220px]">
          <div className="settle absolute left-4 top-10 w-[620px] md:left-[160px] md:top-14">
            <div data-ui className="rounded-[18px] bg-canvas">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="size-8 rounded-full bg-primary" aria-hidden />
                <div>
                  <p className="text-[15px] font-semibold">Lumen &amp; Loom</p>
                  <p className="text-[13px] text-ink-48">Replies in seconds</p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 bg-pearl px-4 py-4" lang="hi">
                <div className="flex justify-end">
                  <p className="max-w-[78%] rounded-[18px] rounded-br-md bg-primary px-3.5 py-2 text-[15px] text-white">मेरा ऑर्डर भारत कब तक पहुँचेगा?</p>
                </div>
                <div className="flex max-w-[82%] flex-col gap-1.5">
                  <p className="rounded-[18px] rounded-bl-md bg-parchment px-3.5 py-2 text-[15px]">हम 1–2 कार्यदिवस में भेजते हैं, और भारत में डिलीवरी 5–8 दिन में होती है।</p>
                  <span lang="en">
                    <SourceChip n={1} label="Delivery times" />
                  </span>
                </div>
                <div className="flex justify-end">
                  <p className="max-w-[78%] rounded-[18px] rounded-br-md bg-primary px-3.5 py-2 text-[15px] text-white">मुझे पता बदलना है, ऑर्डर LL-1002</p>
                </div>
                <p className="max-w-[82%] rounded-[18px] rounded-bl-md bg-parchment px-3.5 py-2 text-[15px]">मैं आपको हमारी टीम से जोड़ रहा हूँ। आप अगले नंबर पर हैं।</p>
                <p lang="en" className="self-center rounded-full bg-ink px-3 py-1 text-[13px] text-white">
                  Handed to a person · you&apos;re next in line
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="flex-1 rounded-full bg-parchment px-4 py-2 text-[15px] text-ink-48">Write a message</span>
                <span className="rounded-full bg-primary px-4 py-2 text-[15px] font-semibold text-white">Send</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- five training sources ---------- */}
      <section className="bg-tile-1 pt-[120px] md:pt-[200px]" aria-labelledby="sources-heading">
        <div className="rise mb-12 px-6 md:mb-16 md:px-10">
          <h2 id="sources-heading" className="text-[9vw] font-semibold leading-[1.05] tracking-[-0.03em] text-white md:text-[clamp(40px,4vw,64px)]">
            Five ways to teach it
          </h2>
          <p className="mt-6 max-w-[48ch] text-[16px] text-white md:text-[18px]">Switch each one on to see what it does. The bot only answers from what you give it, and shows the source.</p>
        </div>
        <SourceBands />
      </section>

      {/* ---------- agent app ---------- */}
      <section id="app" className="scroll-mt-6 bg-parchment px-6 py-[120px] md:px-10 md:py-[200px]" aria-labelledby="app-heading">
        <div className="rise">
          <AgentAppShowcase />
        </div>
      </section>

      {/* ---------- how it works (the learning loop) ---------- */}
      <section id="how" className="scroll-mt-6" aria-labelledby="how-heading">
        <StageSlider />
      </section>

      {/* ---------- plans ---------- */}
      <section id="plans" className="scroll-mt-6 px-6 py-[120px] md:px-10 md:py-[200px]" aria-labelledby="plans-heading">
        <div className="relative grid gap-2 md:min-h-[760px] md:grid-cols-3 md:items-end">
          <div className="rise mb-8 md:absolute md:left-0 md:top-0 md:mb-0 md:w-[62%]">
            <h2 id="plans-heading" className="text-[9vw] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[4vw]">
              Plans that grow with you
            </h2>
            <p className="mt-4 max-w-[44ch] text-[16px] md:text-[18px]">Start on Free. In this demo you can switch plans from the dashboard at any time, and nothing is charged.</p>
          </div>
          {PLANS.map(({ plan, h, bg, strip, ink, cta }, i) => {
            const l = PLAN_LIMITS[plan];
            return (
              <div key={plan} style={{ "--i": i } as CSSProperties} className={`rise flex flex-col overflow-hidden rounded-t-[48px] rounded-b-[18px] ${bg} ${ink} ${h}`}>
                <div className="flex-1 p-7">
                  <h3 className="text-[28px] font-bold">{PLAN_LABEL[plan]}</h3>
                  <p className="mt-2 text-[44px] font-semibold leading-none tracking-[-0.02em] tabular-nums md:text-[56px]">{fmt(l.aiReplies)}</p>
                  <p className="mt-1 text-[17px]">AI replies a month</p>
                  <ul className="mt-6 flex flex-col gap-1.5 text-[17px]">
                    <li>{fmt(l.widgets)} {l.widgets === 1 ? "chat widget" : "chat widgets"}</li>
                    <li>{fmt(l.agents)} {l.agents === 1 ? "agent seat" : "agent seats"}</li>
                    <li>{fmt(l.qa)} Q&amp;A answers</li>
                    {plan !== "free" && <li>{fmt(l.pages)} website pages</li>}
                    {plan === "business" && <li>{fmt(l.actions)} API actions</li>}
                  </ul>
                </div>
                <Link href="/signup" className={`press flex min-h-16 items-center px-7 text-[17px] font-semibold hover:opacity-90 ${strip}`}>
                  {cta}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- close: the sentence with a blank ---------- */}
      <section className="bg-parchment px-6 py-[120px] md:px-10 md:py-[200px]" aria-labelledby="cta-heading">
        <form action="/signup" method="get" className="rise">
          <h2 id="cta-heading" className="text-[9vw] font-semibold leading-[1.15] tracking-[-0.03em] md:text-[clamp(40px,4.4vw,68px)]">
            Start free with{" "}
            <label className="sr-only" htmlFor="cta-email">
              Your email
            </label>
            <input
              id="cta-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@shop.com"
              className="my-2 block h-[1.15em] w-full rounded-full bg-canvas px-[0.4em] align-baseline text-ink placeholder:text-ink-48 md:my-0 md:inline-block md:w-[7.5em]"
            />{" "}
            <button type="submit" className="press inline-block h-[1.15em] rounded-full bg-primary px-[0.4em] align-baseline text-white hover:bg-primary-focus">
              today
            </button>
          </h2>
          <p className="mt-8 max-w-[52ch] text-[16px] text-ink">Opens sign-up with your email filled in. The Free plan needs no card.</p>
        </form>
      </section>

      {/* ---------- footer: the name, built from chip-ended blocks ---------- */}
      <footer className="bg-tile-1 px-6 pb-8 pt-[120px] text-white md:px-10">
        <div className="flex h-[22svh] items-end gap-1 md:h-[34svh]" aria-label="BizzAssist" role="img">
          {WORDMARK.map((ch, i) => (
            <span
              key={i}
              aria-hidden
              className="flex flex-1 items-end justify-center rounded-t-full pb-[1vw] text-[6vw] font-bold leading-none text-tile-1"
              style={{ height: `${BLOCK_H[i]}%`, background: i < 4 ? "var(--primary-on-dark)" : "var(--canvas)" }}
            >
              {ch}
            </span>
          ))}
        </div>
        <div className="mt-14 grid gap-8 text-[15px] md:grid-cols-12">
          <ul className="flex flex-col gap-2 md:col-span-2">
            <li><a href="#how" className="text-white/80 hover:text-white">How it works</a></li>
            <li><a href="#app" className="text-white/80 hover:text-white">Agent app</a></li>
            <li><a href="#plans" className="text-white/80 hover:text-white">Plans</a></li>
          </ul>
          <ul className="flex flex-col gap-2 md:col-span-2">
            <li><Link href="/signup" className="text-white/80 hover:text-white">Create account</Link></li>
            <li><Link href="/login" className="text-white/80 hover:text-white">Sign in</Link></li>
          </ul>
          <p className="text-white/80 md:col-span-4 md:col-start-9">
            Built on Nexconn Chat for the Nexconn Build Challenge 2026, Marketplace &amp; Support track.
          </p>
        </div>
        <div className="mt-14 flex items-center justify-between gap-4 text-[13px] text-white/70">
          <span>© 2026 BizzAssist</span>
          <Link href="/signup" className="press inline-flex min-h-11 items-center rounded-full bg-white px-4 text-[15px] font-semibold text-ink">
            Start free
          </Link>
        </div>
      </footer>
    </div>
  );
}
