"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, CreditCard, FlaskConical, GraduationCap, Home, Inbox, LayoutGrid, LogOut, Menu, Users, X } from "lucide-react";
import { cn } from "@/components/ui";
import { Wordmark } from "@/components/brand";
import { api } from "@/lib/client";

const GROUPS = [
  {
    label: null,
    items: [
      { href: "/app", label: "Home", icon: Home, owner: true },
      { href: "/app/inbox", label: "Inbox", icon: Inbox, owner: false },
    ],
  },
  {
    label: "Teach the assistant",
    items: [
      { href: "/app/train", label: "Train", icon: GraduationCap, owner: true },
      { href: "/app/playground", label: "Playground", icon: FlaskConical, owner: true },
      { href: "/app/widgets", label: "Widgets", icon: LayoutGrid, owner: true },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/app/analytics", label: "Analytics", icon: BarChart3, owner: true },
      { href: "/app/team", label: "Team", icon: Users, owner: true },
      { href: "/app/plan", label: "Plan", icon: CreditCard, owner: true },
    ],
  },
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

  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));

  async function logout() {
    await api("/api/auth/logout", { body: {} });
    router.replace("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Wordmark href="/app" />
      </div>
      <div className="mx-3 mb-2 rounded-md border border-hairline bg-canvas px-3 py-2.5">
        <p className="truncate text-[14px] font-medium text-ink">{user.business_name}</p>
        <p className="t-fine mt-0.5 text-ink-48">{user.role === "owner" ? "Owner" : "Agent"}</p>
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
        {GROUPS.map((g, gi) => {
          const items = g.items.filter((n) => user.role === "owner" || !n.owner);
          if (!items.length) return null;
          return (
            <div key={gi} className={cn(gi > 0 && "mt-6")}>
              {g.label && <p className="t-fine mb-2 px-3 text-ink-48">{g.label}</p>}
              <ul className="flex flex-col gap-0.5">
                {items.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "press flex h-9 items-center gap-2.5 rounded-md px-3 text-[14px]",
                          active
                            ? "bg-canvas font-medium text-ink shadow-[0_1px_2px_rgb(38_70_83/0.06),0_0_0_1px_rgb(38_70_83/0.05)]"
                            : "text-ink-80 hover:bg-[rgb(23_23_23/0.04)] hover:text-ink",
                        )}
                      >
                        <Icon aria-hidden size={16} strokeWidth={1.5} className={active ? "text-primary" : "text-ink-48"} />
                        <span className="flex-1">{label}</span>
                        {badges[href] ? (
                          <span className={cn("t-mono rounded-[5px] px-1.5 py-0.5", href === "/app/inbox" ? "bg-primary text-white" : "bg-parchment text-ink-80")}>
                            {badges[href]}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-hairline p-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-medium text-white">
            {user.name.trim().charAt(0).toUpperCase() || "?"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-ink">{user.name}</span>
            {user.role === "owner" ? (
              <Link href="/app/plan" className="t-fine text-ink-48 hover:text-ink">
                {planLabel} plan
              </Link>
            ) : (
              <span className="t-fine text-ink-48">Agent</span>
            )}
          </span>
          <button type="button" onClick={logout} aria-label="Sign out" title="Sign out" className="press flex size-9 items-center justify-center rounded-md text-ink-48 hover:bg-parchment hover:text-ink">
            <LogOut size={16} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-pearl">
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 border-r border-hairline bg-parchment min-[900px]:block">{sidebar}</aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-hairline bg-pearl px-3 min-[900px]:hidden">
          <button
            type="button"
            className="press flex size-10 items-center justify-center rounded-md hover:bg-parchment"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>
          <Wordmark href="/app" />
        </header>
        {open && (
          <div className="fixed inset-0 z-40 min-[900px]:hidden">
            <button type="button" aria-label="Close menu" className="fade-in absolute inset-0 bg-[rgb(23_42_50/0.32)]" onClick={() => setOpen(false)} />
            <aside className="sheet-in relative h-full w-[min(280px,85vw)] border-r border-hairline bg-parchment shadow-[var(--shadow-pop)] [animation-name:route-in]">{sidebar}</aside>
          </div>
        )}
        <main key={pathname} className="route-in min-w-0 flex-1 px-4 pb-20 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1360px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
