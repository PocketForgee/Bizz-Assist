import Link from "next/link";
import { cn } from "@/components/ui";

/** The mark: an order-ticket stub with a notch, the shape of the source slip. One solid colour, no gradient. */
export function Mark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className={className}>
      <path
        d="M4 2h12a2 2 0 0 1 2 2v4.2a1.8 1.8 0 0 0 0 3.6V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4.2a1.8 1.8 0 0 0 0-3.6V4a2 2 0 0 1 2-2Z"
        fill="currentColor"
      />
      <path d="M7 7.5h6M7 10h6M7 12.5h3.5" stroke="var(--mark-cut, #fff)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ href = "/", className, tone = "ink" }: { href?: string; className?: string; tone?: "ink" | "light" }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 text-[16px] font-semibold tracking-[-0.01em]", className)}>
      <Mark className={tone === "ink" ? "text-ink" : "text-white"} />
      <span>BizzAssist</span>
    </Link>
  );
}
