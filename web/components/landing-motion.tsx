"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Mark, Wordmark } from "@/components/brand";
import { cn } from "@/components/ui";

/* Motion for the landing page: the floating nav, scroll reveals and the tagline that lights up word by word.
   Everything moves with transform and opacity on the base curve, and settles instantly under reduced motion. */

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#plans", label: "Plans" },
  { href: "#faq", label: "Questions" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  // the section in view marks its nav link as current
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(`#${e.target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const l of LINKS) {
      const el = document.querySelector(l.href);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <nav
          aria-label="Main"
          className="flex w-full max-w-fit items-center gap-1 rounded-2xl border border-paper-ink/10 bg-paper/75 p-2 shadow-[0_8px_24px_-12px_rgb(38_70_83/0.25)] backdrop-blur-md max-md:w-full max-md:max-w-none max-md:justify-between"
        >
          <Wordmark className="rounded-lg px-2 py-1 text-paper-ink" />
          <span className="mx-2 hidden h-5 w-px bg-paper-ink/10 md:block" aria-hidden />
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              aria-current={active === l.href ? "location" : undefined}
              className={cn(
                "title-4 hidden rounded-lg px-3 py-2 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-paper-raised md:block",
                active === l.href ? "bg-paper-raised text-paper-ink" : "text-paper-ink-2",
              )}
            >
              {l.label}
            </a>
          ))}
          <Link href="/login" className="title-4 hidden rounded-lg px-3 py-2 text-paper-ink-2 transition-colors duration-300 hover:bg-paper-raised hover:text-paper-ink md:block">
            Sign in
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/signup" className="press button-sm ml-1 rounded-lg bg-primary px-3 py-2 text-white hover:bg-primary-focus">
              Start free
            </Link>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="landing-menu"
              onClick={() => setOpen((o) => !o)}
              className="press relative flex size-10 items-center justify-center rounded-lg hover:bg-paper-raised md:hidden"
            >
              {/* two lines that turn into a cross */}
              <span
                className={cn(
                  "absolute h-0.5 w-5 rounded-full bg-paper-ink transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  open ? "rotate-45" : "-translate-y-1",
                )}
              />
              <span
                className={cn(
                  "absolute h-0.5 w-5 rounded-full bg-paper-ink transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  open ? "-rotate-45" : "translate-y-1",
                )}
              />
            </button>
          </div>
        </nav>
      </header>

      {/* mobile menu: a full height panel; links rise in one after another */}
      <div
        id="landing-menu"
        inert={!open}
        className={cn(
          "fixed inset-0 z-40 bg-paper/95 backdrop-blur-xl transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <nav aria-label="Menu" className="flex h-full flex-col gap-2 px-6 pt-24 pb-10">
          {[...LINKS, { href: "/login", label: "Sign in" }].map((l, n) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: open ? `${Math.min(n * 60, 340)}ms` : "0ms" }}
              className={cn(
                "heading-4 rounded-lg py-2 text-paper-ink transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
              )}
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}

/** Sections marked data-reveal rise 32px and fade in once as they enter the screen. */
export function RevealRoot() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      root.classList.remove("js-reveal");
    };
  }, []);
  return null;
}

/** The tagline: each word goes from muted to full ink, in reading order, as the block scrolls through the screen. */
export function TaglineReveal({ lines, className }: { lines: string[]; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = Array.from(el.querySelectorAll<HTMLElement>("[data-w]"));
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      words.forEach((w) => w.setAttribute("data-on", ""));
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      // starts when the block's top reaches 85% of the screen, finishes when its bottom reaches 45%
      const start = innerHeight * 0.85;
      const end = innerHeight * 0.45;
      const p = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height)));
      const lit = Math.round(p * words.length);
      words.forEach((w, n) => w.toggleAttribute("data-on", n < lit));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <p ref={ref} className={className}>
      {lines.map((line) => (
        <span key={line} className="block">
          {line.split(" ").map((w, n) => (
            <span key={n}>
              <span data-w className="tag-word">
                {w}
              </span>{" "}
            </span>
          ))}
        </span>
      ))}
    </p>
  );
}

/* ---- the living backdrop ----
   What a support desk sees all day, drifting up behind the page: the same question in every language the team
   reads, the source slips answers carry, ticket stubs and the palette's dots. Flat colours, transform and opacity
   only, three depth layers that lean with the pointer and the scroll. Positions are fixed data, so server and
   client render the same thing. */

type Drift = {
  k: "q" | "slip" | "mark" | "dot";
  text?: string;
  tone: "paper" | "saffron" | "teal" | "sand" | "sienna";
  x: number; // left, % of the screen
  y: number; // resting top for reduced motion, %
  dur: number; // seconds to rise through the screen
  delay: number; // negative: already on its way at load
  z: 1 | 2 | 3; // depth layer: 1 far, 3 near
  size?: number;
  wide?: boolean; // only on screens md and up
};

const DRIFT: Drift[] = [
  { k: "q", text: "Where is my order?", tone: "paper", x: 4, y: 18, dur: 34, delay: -4, z: 2 },
  { k: "q", text: "¿Dónde está mi pedido?", tone: "saffron", x: 72, y: 12, dur: 38, delay: -22, z: 3 },
  { k: "q", text: "मेरा ऑर्डर कहाँ है?", tone: "paper", x: 84, y: 58, dur: 30, delay: -9, z: 2 },
  { k: "q", text: "Où est ma commande ?", tone: "teal", x: 10, y: 70, dur: 42, delay: -30, z: 1, wide: true },
  { k: "q", text: "أين طلبي؟", tone: "paper", x: 58, y: 84, dur: 36, delay: -15, z: 1, wide: true },
  { k: "q", text: "Wo ist meine Bestellung?", tone: "sand", x: 30, y: 40, dur: 46, delay: -36, z: 1, wide: true },
  { k: "q", text: "Cadê meu pedido?", tone: "paper", x: 88, y: 30, dur: 33, delay: -27, z: 3, wide: true },
  { k: "q", text: "Di mana pesanan saya?", tone: "paper", x: 44, y: 8, dur: 40, delay: -6, z: 2, wide: true },
  { k: "slip", text: "S1 Shipping policy", tone: "teal", x: 20, y: 30, dur: 31, delay: -18, z: 2 },
  { k: "slip", text: "S2 Order lookup", tone: "paper", x: 66, y: 46, dur: 37, delay: -2, z: 1, wide: true },
  { k: "slip", text: "Q&A 08 · Learned", tone: "saffron", x: 6, y: 92, dur: 29, delay: -12, z: 3, wide: true },
  { k: "slip", text: "Translated · ES", tone: "paper", x: 78, y: 76, dur: 35, delay: -31, z: 2 },
  { k: "slip", text: "Handed to Priya", tone: "sienna", x: 50, y: 62, dur: 44, delay: -40, z: 1, wide: true },
  { k: "mark", tone: "teal", x: 92, y: 8, dur: 27, delay: -8, z: 3, size: 28 },
  { k: "mark", tone: "saffron", x: 2, y: 48, dur: 32, delay: -20, z: 2, size: 22 },
  { k: "mark", tone: "sienna", x: 38, y: 88, dur: 39, delay: -33, z: 1, size: 18, wide: true },
  { k: "mark", tone: "sand", x: 62, y: 22, dur: 41, delay: -14, z: 1, size: 16, wide: true },
  { k: "dot", tone: "saffron", x: 16, y: 10, dur: 24, delay: -3, z: 3, size: 14 },
  { k: "dot", tone: "teal", x: 54, y: 36, dur: 28, delay: -19, z: 2, size: 10 },
  { k: "dot", tone: "sienna", x: 96, y: 66, dur: 26, delay: -11, z: 3, size: 12 },
  { k: "dot", tone: "sand", x: 26, y: 78, dur: 30, delay: -25, z: 2, size: 18, wide: true },
  { k: "dot", tone: "teal", x: 74, y: 94, dur: 34, delay: -7, z: 1, size: 8, wide: true },
  { k: "dot", tone: "saffron", x: 46, y: 52, dur: 36, delay: -29, z: 1, size: 22, wide: true },
  { k: "dot", tone: "sienna", x: 34, y: 16, dur: 25, delay: -16, z: 2, size: 6 },
];

const BUBBLE: Record<Drift["tone"], string> = {
  paper: "border border-paper-ink/10 bg-white text-paper-ink-2",
  saffron: "bg-saffron text-paper-ink",
  teal: "bg-teal text-white",
  sand: "bg-sand text-paper-ink",
  sienna: "bg-sienna text-white",
};
const SOLID: Record<Drift["tone"], string> = {
  paper: "text-paper-ink/20 bg-paper-ink/20",
  saffron: "text-saffron bg-saffron",
  teal: "text-teal bg-teal",
  sand: "text-sand bg-sand",
  sienna: "text-sienna bg-sienna",
};
// nearer layers are stronger, so depth reads at a glance
const OPACITY = { 1: 0.3, 2: 0.45, 3: 0.6 } as const;

export function LivelyBackdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let mx = 0;
    let my = 0;
    const paint = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      el.style.setProperty("--sp", String(max > 0 ? scrollY / max : 0));
      el.style.setProperty("--mx", mx.toFixed(3));
      el.style.setProperty("--my", my.toFixed(3));
    };
    const ask = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onMove = (e: PointerEvent) => {
      mx = e.clientX / innerWidth - 0.5;
      my = e.clientY / innerHeight - 0.5;
      ask();
    };
    const fine = matchMedia("(pointer: fine)").matches;
    if (fine) addEventListener("pointermove", onMove, { passive: true });
    addEventListener("scroll", ask, { passive: true });
    paint();
    return () => {
      if (fine) removeEventListener("pointermove", onMove);
      removeEventListener("scroll", ask);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden print:hidden">
      {([1, 2, 3] as const).map((z) => (
        <div key={z} className="lively-layer absolute inset-0" style={{ "--z": z } as CSSProperties}>
          {DRIFT.filter((d) => d.z === z).map((d, n) => (
            <div
              key={n}
              className={cn("drift absolute", d.wide && "max-md:hidden")}
              style={
                {
                  left: `${d.x}%`,
                  "--y": `${d.y}%`,
                  "--o": OPACITY[z],
                  "--dur": `${d.dur}s`,
                  "--delay": `${d.delay}s`,
                  "--sw": `${6 + (n % 4) * 1.5}s`,
                } as CSSProperties
              }
            >
              <div className="sway">
                {d.k === "q" && (
                  <span className={cn("caption-4 block rounded-2xl rounded-bl-sm px-3 py-2 whitespace-nowrap shadow-[0_8px_20px_-12px_rgb(38_70_83/0.35)]", BUBBLE[d.tone], z === 3 && "body-6")}>
                    {d.text}
                  </span>
                )}
                {d.k === "slip" && <span className={cn("slip bg-white/60", d.tone === "paper" ? "text-paper-ink-2" : SOLID[d.tone].split(" ")[0])}>{d.text}</span>}
                {d.k === "mark" && <Mark size={d.size} className={SOLID[d.tone].split(" ")[0]} />}
                {d.k === "dot" && <span className={cn("block rounded-full", SOLID[d.tone].split(" ")[1])} style={{ width: d.size, height: d.size }} />}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
