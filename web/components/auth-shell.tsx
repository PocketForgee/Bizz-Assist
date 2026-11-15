import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand";
import { LivelyBackdrop } from "@/components/landing-motion";

export { Wordmark };

/**
 * Sign-in / sign-up: the form on a calm left half, and on the right the one thing the product does,
 * shown as a real exchange (an agent answers once; the next time, the bot answers with the slip).
 */
export function AuthShell({ title, lead, children, width = 380 }: { title: string; lead?: string; children: ReactNode; width?: number }) {
  return (
    <div className="relative min-h-dvh bg-pearl">
      {/* the landing page's living backdrop; the form sits on a solid card above it */}
      <LivelyBackdrop />
      <main className="relative z-10 grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-4 py-8 sm:px-12">
        <Wordmark className="w-fit rounded-lg bg-pearl/80 px-2 py-1 backdrop-blur-sm" />
        <div
          className="enter my-auto w-full rounded-2xl border border-hairline bg-canvas/90 p-6 shadow-[var(--shadow-pop)] backdrop-blur-md sm:p-8"
          style={{ maxWidth: width + 64 }}
        >
          <h1 className="t-display text-ink">{title}</h1>
          {lead && <p className="t-caption mt-2 text-ink-48">{lead}</p>}
          <div className="mt-8">{children}</div>
        </div>
        <p className="t-fine w-fit rounded-md bg-pearl/80 px-2 py-1 text-ink-48 backdrop-blur-sm">Support chat that learns your shop</p>
      </div>

      <aside aria-hidden className="relative hidden overflow-hidden border-l border-hairline bg-paper/70 text-paper-ink backdrop-blur-[2px] lg:flex lg:flex-col lg:justify-center lg:px-16">
        <p className="heading-3 text-paper-ink">
          Answered once.
          <br />
          <span className="text-paper-ink-2">Answered from then on.</span>
        </p>
        <div className="play mt-12 flex max-w-[440px] flex-col gap-3">
          <div style={{ "--t": 200 } as React.CSSProperties} className="max-w-[80%] self-start rounded-[14px] rounded-bl-[4px] bg-white px-4 py-2.5 text-[14px] text-paper-ink shadow-[0_1px_2px_rgb(38_70_83/0.05)]">
            Can I return a cushion cover I&apos;ve already used?
          </div>
          <div style={{ "--t": 700 } as React.CSSProperties} className="flex items-center gap-2 self-center py-1 text-[12px] text-paper-ink-2">
            <span className="h-px w-8 bg-paper-ink/15" />
            Priya from the team joined
            <span className="h-px w-8 bg-paper-ink/15" />
          </div>
          <div style={{ "--t": 1200 } as React.CSSProperties} className="max-w-[80%] self-end rounded-[14px] rounded-br-[4px] bg-paper-ink px-4 py-2.5 text-[14px] text-paper">
            Yes, within 30 days if it&apos;s faulty. Send us a photo and we&apos;ll arrange it.
          </div>
          <div style={{ "--t": 1900 } as React.CSSProperties} className="mt-6 rounded-[12px] border border-dashed border-paper-ink/25 bg-paper-raised/60 p-4">
            <div className="flex items-center justify-between text-[12px] text-paper-ink-2">
              <span>Learned from Priya&apos;s answer</span>
              <span className="slip text-primary">Q&amp;A 08</span>
            </div>
            <p className="mt-2 text-[14px] text-paper-ink">Used items can be returned within 30 days when faulty, with a photo.</p>
          </div>
        </div>
      </aside>
      </main>
    </div>
  );
}
