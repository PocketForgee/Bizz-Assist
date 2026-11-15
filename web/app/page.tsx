import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRightIcon, ArrowUpRightIcon, PackageIcon, PlusIcon, SealCheckIcon, ShieldCheckIcon, TranslateIcon } from "@phosphor-icons/react/ssr";
import { PLAN_LABEL, PLAN_LIMITS, type Plan } from "@/lib/plans";
import { Mark } from "@/components/brand";
import { HeroChat, InboxFragment, LoopSlider, PhoneFragment, SourcesFragment } from "@/components/landing";
import { LandingNav, RevealRoot, TaglineReveal } from "@/components/landing-motion";

const TITLE = "BizzAssist: support chat that learns your shop";
const DESCRIPTION =
  "Support chat for online shops. It answers from your website, documents and order data, hands hard chats to your team, and learns from every answer they give.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", siteName: "BizzAssist" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

// Idea: a shop's service counter. Every answer carries a slip saying where it came from, and every answer
// a person gives becomes a new slip the assistant can use. The slip is the page's one recurring shape.
// One offer (the free plan), one audience (online shops), one action (Start free).
const fmt = (n: number) => n.toLocaleString("en-US");
const d = (ms: number) => ({ "--d": ms }) as CSSProperties;
const FREE = PLAN_LIMITS.free;

const BENEFITS = [
  { icon: SealCheckIcon, title: "Answers you can check", line: "Every reply names the page, document or order it came from." },
  { icon: ShieldCheckIcon, title: "No guessing", line: "When nothing it was taught covers a question, it offers a person instead of making something up." },
  { icon: PackageIcon, title: "Order status in the chat", line: "It looks up an order only when the order number and the email or phone both match." },
  { icon: TranslateIcon, title: "Two languages, one chat", line: "Customers write in theirs. Your team reads and replies in its own." },
];

const STEPS = [
  { title: "Paste your website address", line: "It reads your homepage and policy pages while you finish signing up." },
  { title: "Add the chat to your shop", line: "Paste one script tag into your site, or share the chat link and its QR code." },
  { title: "Answer what it can't", line: "Hand overs land in your web inbox and the Android app. Approve the answers worth keeping." },
];

const PLANS: { plan: Plan; line: string; lead?: boolean }[] = [
  { plan: "free", line: "One widget and one person answering. Enough to see it work on your shop." },
  { plan: "pro", line: "For a shop with a small team and live order lookups.", lead: true },
  { plan: "business", line: "Several brands or sites, and a full support team." },
];

const ROWS: { key: keyof (typeof PLAN_LIMITS)["free"]; label: string }[] = [
  { key: "widgets", label: "Widgets" },
  { key: "agents", label: "People answering" },
  { key: "qa", label: "Q&A answers" },
  { key: "pages", label: "Website pages" },
  { key: "actions", label: "Order lookups" },
];

const FAQ = [
  {
    q: "Where do the answers come from?",
    a: "Only from what you give it: your website pages, documents, Q&A entries, order lookups and the learned answers you approve. Each reply shows its sources so you and your customer can check them.",
  },
  {
    q: "What happens when it can't answer?",
    a: "It tells the customer and hands the chat to your team with a summary: the issue, what it already tried and the customer's details. Someone claims the chat from the web inbox or the Android app and answers.",
  },
  {
    q: "Does it learn without my say?",
    a: "No. Answers your team gives in handed over chats become suggestions. They reach customers only after you approve them in Train.",
  },
  {
    q: "Which languages does it handle?",
    a: "Customers can write in their own language and get replies in it. Each person on your team picks the language they read chats in: English, Hindi, Spanish, Arabic, French, German, Portuguese or Indonesian.",
  },
  {
    q: "How does it look up orders?",
    a: "Connect a REST endpoint or a Google Sheet published as CSV. It returns an order only when both the order number and the email or phone match, so one customer can't read another's order.",
  },
  {
    q: "How do I put it on my site?",
    a: "Paste one script tag before the closing body tag. If you don't run a website, share the chat link or print its QR code.",
  },
  {
    q: "What does the free plan include?",
    a: `${FREE.widgets} widget, ${FREE.agents} person answering, ${fmt(FREE.aiReplies)} AI replies a month, ${FREE.pages} website pages and ${FREE.qa} Q&A answers. No card needed.`,
  },
  {
    q: "How is my data protected?",
    a: "Team passwords are stored as scrypt hashes, and the keys for your order lookups are encrypted with AES 256 GCM. Your API secrets never reach the browser.",
  },
];

export default function Home() {
  return (
    <div className="paper min-h-dvh">
      <a href="#main" className="button-sm sr-only z-[60] rounded-lg bg-paper-ink px-3 py-2 text-paper focus:not-sr-only focus:fixed focus:top-4 focus:left-4">
        Skip to content
      </a>
      <LandingNav />
      <RevealRoot />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          }),
        }}
      />

      <main id="main">
        {/* ---------- hero: the claim, and the product doing it ---------- */}
        <section className="mx-auto grid max-w-[1240px] items-center gap-16 px-6 pt-24 pb-24 md:px-10 lg:min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:pt-24 lg:pb-16">
          <div className="enter">
            <p className="caption-4 flex items-center gap-2 text-paper-ink-2">
              <span className="slip text-primary">S1</span>
              Support chat for online shops
            </p>
            <h1 className="hero-gradient heading-3 mt-6 max-w-[680px] sm:heading-2 lg:heading-1">
              Support chat that
              <br />
              learns your shop
            </h1>
            <p className="body-3 mt-6 max-w-[680px] text-paper-ink-2 sm:title-2">
              It answers your customers from your website, policies and order data. What it can&apos;t answer goes to your team, and every reply they give becomes
              something it knows.
            </p>
            <div className="mt-8">
              <Link href="/signup" className="press button-md inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-white hover:bg-primary-focus">
                Start free <ArrowRightIcon size={16} aria-hidden />
              </Link>
            </div>
            <p className="caption-5 mt-6 flex flex-wrap gap-x-3 gap-y-1 text-paper-ink-2">
              <span>Free plan with {fmt(FREE.aiReplies)} AI replies a month</span>
              <span aria-hidden>·</span>
              <span>No card needed</span>
              <span aria-hidden>·</span>
              <span>Android app for your team</span>
            </p>
          </div>
          <div className="pb-8 lg:pb-0">
            <HeroChat />
          </div>
        </section>

        {/* ---------- problem to solution ---------- */}
        <section className="border-t border-paper-ink/10 bg-paper-raised/40">
          <div className="mx-auto max-w-[1240px] px-6 py-20 md:px-10 md:py-24">
            <div data-reveal className="max-w-[680px]">
              <p className="t-mono text-paper-ink-2">01 · Teach it</p>
              <h2 className="heading-4 mt-3 text-paper-ink lg:heading-3">Most questions already have an answer on your site</h2>
              <p className="body-3 mt-4 text-paper-ink-2">
                Customers still wait for someone to find it. BizzAssist reads what your shop has published and answers with the source attached. When nothing it was taught covers
                the question, it says so instead of guessing.
              </p>
            </div>
            <div data-reveal style={d(120)} className="mt-12">
              <SourcesFragment />
            </div>
          </div>
        </section>

        {/* ---------- benefits ---------- */}
        <section className="border-t border-paper-ink/10">
          <div className="mx-auto max-w-[1240px] px-6 py-20 md:px-10 md:py-24">
            <h2 data-reveal className="heading-4 max-w-[680px] text-paper-ink lg:heading-3">
              What your customers get
            </h2>
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((b, n) => (
                <li
                  key={b.title}
                  data-reveal
                  style={d(n * 80)}
                  className="rounded-2xl border border-paper-ink/10 bg-white/70 p-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1"
                >
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <b.icon size={20} aria-hidden />
                  </span>
                  <h3 className="title-2 mt-6 text-paper-ink">{b.title}</h3>
                  <p className="body-6 mt-2 text-paper-ink-2">{b.line}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- hand over ---------- */}
        <section className="border-t border-paper-ink/10 bg-paper-raised/40">
          <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-6 py-20 md:px-10 md:py-24 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div data-reveal style={d(120)} className="order-2 lg:order-1">
              <InboxFragment />
            </div>
            <div data-reveal className="order-1 lg:order-2">
              <p className="t-mono text-paper-ink-2">02 · Hand over</p>
              <h2 className="heading-4 mt-3 text-paper-ink lg:heading-3">Hard chats reach a person, already explained</h2>
              <p className="body-3 mt-4 text-paper-ink-2">
                Your team sees the issue, what the assistant tried and the customer&apos;s details before they say hello. They answer from the web inbox or the Android app, each
                side in their own language.
              </p>
              <div className="mt-10 hidden sm:block">
                <PhoneFragment />
              </div>
            </div>
          </div>
        </section>

        {/* ---------- tagline reveal ---------- */}
        <section aria-label="What it does for you" className="border-t border-paper-ink/10">
          <div className="mx-auto max-w-[1240px] px-6 py-24 md:px-10">
            <TaglineReveal
              lines={["Answer a question once.", "Your assistant answers it", "for every customer after."]}
              className="heading-3 max-w-[680px] text-paper-ink sm:heading-2 lg:heading-1"
            />
          </div>
        </section>

        {/* ---------- how it works ---------- */}
        <section id="how" className="scroll-mt-24 border-t border-paper-ink/10 bg-paper-raised/40">
          <div className="mx-auto max-w-[1240px] px-6 py-20 md:px-10 md:py-24">
            <div data-reveal className="max-w-[680px]">
              <p className="t-mono text-paper-ink-2">03 · How it works</p>
              <h2 className="heading-4 mt-3 text-paper-ink lg:heading-3">Live on your shop in three steps</h2>
            </div>
            <ol className="mt-12 grid gap-4 md:grid-cols-3">
              {STEPS.map((s, n) => (
                <li key={s.title} data-reveal style={d(n * 100)} className="rounded-2xl border border-paper-ink/10 bg-white/70 p-6">
                  <span className="slip text-primary">Step 0{n + 1}</span>
                  <h3 className="title-2 mt-6 text-paper-ink">{s.title}</h3>
                  <p className="body-6 mt-2 text-paper-ink-2">{s.line}</p>
                </li>
              ))}
            </ol>

            <div data-reveal className="mt-20 max-w-[680px]">
              <h3 className="heading-5 text-paper-ink">Drag through one question&apos;s life</h3>
              <p className="body-3 mt-2 text-paper-ink-2">Nothing reaches customers until you approve it.</p>
            </div>
            <div data-reveal style={d(120)} className="mt-10">
              <LoopSlider />
            </div>
          </div>
        </section>

        {/* ---------- proof: the real thing, running ---------- */}
        <section className="border-t border-paper-ink/10">
          <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-6 py-20 md:px-10 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div data-reveal className="max-w-[680px]">
              <p className="t-mono text-paper-ink-2">See it work</p>
              <h2 className="heading-4 mt-3 text-paper-ink lg:heading-3">Chat with a shop that runs on it</h2>
              <p className="body-3 mt-4 text-paper-ink-2">
                Lumen &amp; Loom is a demo homeware shop running on BizzAssist. Ask it anything a customer would. Ask for a person and the chat goes to its team.
              </p>
              <Link
                href="/demo"
                className="press button-md mt-8 inline-flex items-center gap-2 rounded-lg border border-paper-ink/15 bg-white px-3 py-2 text-paper-ink hover:bg-paper-raised"
              >
                Open the demo shop chat <ArrowUpRightIcon size={16} aria-hidden />
              </Link>
            </div>
            <ul data-reveal style={d(120)} className="flex flex-col gap-3">
              {["Do you deliver to Spain, and how long does it take?", "Where is my order LL‑1002? My email is arjun@example.com", "Can I return a cushion cover I've already used?"].map((q) => (
                <li key={q} className="body-5 flex items-start gap-3 rounded-xl border border-paper-ink/10 bg-white/70 px-4 py-3 text-paper-ink">
                  <span className="slip mt-0.5 shrink-0 text-paper-ink-2">Try</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- plans ---------- */}
        <section id="plans" className="scroll-mt-24 border-t border-paper-ink/10 bg-paper-raised/40">
          <div className="mx-auto max-w-[1240px] px-6 py-20 md:px-10 md:py-24">
            <div data-reveal className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-[680px]">
                <p className="t-mono text-paper-ink-2">Plans</p>
                <h2 className="heading-4 mt-3 text-paper-ink lg:heading-3">Start free. Grow when the chats do</h2>
              </div>
              <p className="body-6 max-w-[22rem] text-paper-ink-2">Every plan has the same assistant, handover, translation and learning. Plans differ in volume.</p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {PLANS.map(({ plan, line, lead }, n) => (
                <div
                  key={plan}
                  data-reveal
                  style={d(n * 100)}
                  className={
                    lead
                      ? "flex flex-col rounded-2xl bg-paper-ink p-6 text-paper shadow-[var(--shadow-product)]"
                      : "flex flex-col rounded-2xl border border-paper-ink/10 bg-white/70 p-6 text-paper-ink"
                  }
                >
                  <div className="flex items-center justify-between">
                    <h3 className="title-2">{PLAN_LABEL[plan]}</h3>
                    {lead && <span className="slip text-saffron">Most shops</span>}
                  </div>
                  <p className={lead ? "body-6 mt-2 min-h-10 text-paper/70" : "body-6 mt-2 min-h-10 text-paper-ink-2"}>{line}</p>
                  <p className="t-figure mt-8">{fmt(PLAN_LIMITS[plan].aiReplies)}</p>
                  <p className={lead ? "caption-2 mt-1 text-paper/70" : "caption-2 mt-1 text-paper-ink-2"}>AI replies a month</p>
                  <dl className={lead ? "mt-6 divide-y divide-paper/10 border-y border-paper/10" : "mt-6 divide-y divide-paper-ink/10 border-y border-paper-ink/10"}>
                    {ROWS.map((r) => (
                      <div key={r.key} className="caption-2 flex h-10 items-center justify-between">
                        <dt className={lead ? "text-paper/70" : "text-paper-ink-2"}>{r.label}</dt>
                        <dd className="t-mono">{fmt(PLAN_LIMITS[plan][r.key])}</dd>
                      </div>
                    ))}
                  </dl>
                  <Link
                    href="/signup"
                    className={
                      lead
                        ? "press button-md mt-8 inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-white hover:bg-primary-focus"
                        : "press button-md mt-8 inline-flex items-center justify-center rounded-lg border border-paper-ink/15 bg-white px-3 py-2 text-paper-ink hover:bg-paper"
                    }
                  >
                    Start free
                  </Link>
                </div>
              ))}
            </div>
            <p data-reveal className="caption-2 mt-6 text-paper-ink-2">
              Every account starts on Free, no card needed. Billing isn&apos;t switched on yet, so moving between plans takes no payment.
            </p>
          </div>
        </section>

        {/* ---------- questions ---------- */}
        <section id="faq" className="scroll-mt-24 border-t border-paper-ink/10">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-20 md:px-10 md:py-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div data-reveal>
              <p className="t-mono text-paper-ink-2">Questions</p>
              <h2 className="heading-4 mt-3 text-paper-ink lg:heading-3">Before you paste the script tag</h2>
            </div>
            <div data-reveal style={d(120)} className="divide-y divide-paper-ink/10 border-y border-paper-ink/10">
              {FAQ.map((f) => (
                <details key={f.q} className="faq group">
                  <summary className="title-3 flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-4 text-paper-ink [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <PlusIcon
                      size={18}
                      aria-hidden
                      className="shrink-0 text-paper-ink-2 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-open:rotate-45"
                    />
                  </summary>
                  <p className="faq-a body-3 max-w-[680px] pb-6 text-paper-ink-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- close: same action as the top ---------- */}
        <section className="bg-paper-ink text-paper">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-20 md:px-10 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-end">
            <h2 data-reveal className="heading-3 max-w-[680px] sm:heading-2">
              Paste your website.
              <br />
              <span className="text-paper/60">Answer your first customer today.</span>
            </h2>
            <form data-reveal style={d(120)} action="/signup" method="get" className="flex flex-col gap-3 sm:flex-row">
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
                className="body-3 h-12 flex-1 rounded-lg border border-paper/15 bg-white/5 px-4 text-paper transition-[border-color,box-shadow] duration-300 placeholder:text-paper/40 focus:border-paper/40 focus:shadow-[0_0_0_3px_rgb(255_255_255/0.08)] focus:outline-none user-invalid:border-danger-on-dark"
              />
              <button type="submit" className="press button-md h-12 inline-flex items-center justify-center gap-2 rounded-lg bg-paper px-4 text-paper-ink hover:bg-white">
                Start free <ArrowRightIcon size={16} aria-hidden />
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="bg-paper-ink text-paper">
        <div className="caption-2 mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 border-t border-paper/10 px-6 py-8 text-paper/60 md:px-10">
          <span className="title-4 flex items-center gap-2 text-paper">
            <Mark size={18} className="text-paper [--mark-cut:var(--paper-ink)]" />
            BizzAssist
          </span>
          <span>Built on Nexconn for the Nexconn Build Challenge 2026</span>
          <nav aria-label="Account" className="flex gap-4">
            <Link href="/login" className="transition-colors duration-300 hover:text-paper">
              Sign in
            </Link>
            <Link href="/signup" className="transition-colors duration-300 hover:text-paper">
              Create an account
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
