"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand";
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
