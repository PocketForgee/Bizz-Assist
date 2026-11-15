import Link from "next/link";
import { ButtonLink } from "@/components/ui";

// Minimal Phase 1 landing. The full marketing page (taste run, DESIGN_SPEC 5) is built in Phase 3.
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-11 items-center justify-between bg-black px-6 text-[12px] text-white">
        <span className="text-[15px] font-semibold tracking-tight">BizzAssist</span>
        <Link href="/login" className="flex min-h-11 items-center text-white/80 hover:text-white">
          Sign in
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <h1 className="t-hero max-w-3xl">Support chat that answers from what you teach it.</h1>
        <p className="t-lead max-w-2xl text-ink-80">
          Your customers get instant answers in their language. When the bot can&apos;t help, a person on your team takes over.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <ButtonLink href="/signup">Start free</ButtonLink>
          <ButtonLink href="/login" variant="secondary">
            Sign in
          </ButtonLink>
        </div>
      </main>
      <footer className="bg-parchment px-6 py-6 t-fine text-ink-48">BizzAssist · Nexconn Build Challenge 2026</footer>
    </div>
  );
}
