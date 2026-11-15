import Link from "next/link";
import type { ReactNode } from "react";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`t-tagline tracking-tight ${className}`}>
      BizzAssist
    </Link>
  );
}

/** Centred 400px white card on parchment (DESIGN_SPEC 5: Auth and onboarding). */
export function AuthShell({ title, lead, children, width = 400 }: { title: string; lead?: string; children: ReactNode; width?: number }) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-parchment px-4 py-16">
      <Wordmark className="mb-8 text-ink" />
      <div className="route-in w-full rounded-lg border border-hairline bg-canvas p-8" style={{ maxWidth: width }}>
        <h1 className="t-tagline text-ink">{title}</h1>
        {lead && <p className="t-caption mt-1 text-ink-48">{lead}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
