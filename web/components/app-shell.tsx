"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, CreditCard, FlaskConical, GraduationCap, Home, Inbox, LayoutGrid, LogOut, Menu, Users, X } from "lucide-react";
import { cn } from "@/components/ui";
import { api } from "@/lib/client";

const NAV = [
  { href: "/app", label: "Home", icon: Home, owner: true },
  { href: "/app/widgets", label: "Widgets", icon: LayoutGrid, owner: true },
  { href: "/app/train", label: "Train", icon: GraduationCap, owner: true },
  { href: "/app/playground", label: "Playground", icon: FlaskConical, owner: true },
  { href: "/app/inbox", label: "Inbox", icon: Inbox, owner: false },
  { href: "/app/team", label: "Team", icon: Users, owner: true },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3, owner: true },
  { href: "/app/plan", label: "Plan", icon: CreditCard, owner: true },
] as const;

export function AppShell({
  user,
  planLabel,
  badges,
  children,
}: {
  user: { name: string; role: "owner" | "agent"; business_name: string };
  planLabel: string;
  badges: Partial<Record<string, number>>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const items = NAV.filter((n) => user.role === "owner" || !n.owner);
  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));

  async function logout() {
    await api("/api/auth/logout", { body: {} });
    router.replace("/login");
    router.refresh();
  }

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-0.5 p-3">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "press flex h-9 items-center gap-3 rounded-pill px-3 t-caption",
            isActive(href) ? "bg-parchment font-semibold text-ink" : "text-ink-80 hover:bg-parchment/60",
          )}
        >
          <Icon aria-hidden size={20} strokeWidth={1.75} />
          <span className="flex-1">{label}</span>
          {badges[href] ? <span className="rounded-pill bg-primary px-1.5 t-fine font-semibold text-white">{badges[href]}</span> : null}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex h-11 items-center gap-3 bg-black px-4 text-white">
        <button type="button" className="press -ml-2 flex size-11 items-center justify-center min-[834px]:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
        </button>
        <Link href="/app" className="text-[15px] font-semibold tracking-tight">
          BizzAssist
        </Link>
        <span className="hidden truncate text-[12px] text-white/60 sm:inline">{user.business_name}</span>
        <div className="ml-auto flex items-center gap-4 text-[12px]">
          <Link href="/app/plan" className="rounded-pill border border-white/30 px-2 py-0.5 hover:border-white">
            {planLabel}
          </Link>
          <span className="hidden text-white/80 sm:inline">{user.name}</span>
          <button type="button" onClick={logout} className="press flex min-h-11 items-center gap-1 text-white/80 hover:text-white">
            <LogOut size={14} aria-hidden /> Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-[232px] shrink-0 border-r border-hairline bg-canvas min-[834px]:block">
          <div className="sticky top-11">{nav}</div>
        </aside>
        {open && (
          <div className="fixed inset-0 top-11 z-20 min-[834px]:hidden">
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
            <aside className="route-in relative h-full w-[260px] bg-canvas shadow-[var(--shadow-pop)]">{nav}</aside>
          </div>
        )}
        <main key={pathname} className="route-in min-w-0 flex-1 bg-parchment px-6 pb-16 lg:px-8">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
