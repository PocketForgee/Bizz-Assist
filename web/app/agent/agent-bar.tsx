"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { api } from "@/lib/client";

export function AgentBar({ name, business, isOwner }: { name: string; business: string; isOwner: boolean }) {
  const router = useRouter();
  async function logout() {
    await api("/api/auth/logout", { body: {} });
    router.replace("/login");
    router.refresh();
  }
  return (
    <header className="flex h-11 shrink-0 items-center gap-3 bg-black px-4 text-white">
      <span className="text-[15px] font-semibold tracking-tight">BizzAssist</span>
      <span className="hidden truncate text-[12px] text-white/60 sm:inline">{business}</span>
      <div className="ml-auto flex items-center gap-4 text-[12px]">
        {isOwner && (
          <Link href="/app" className="text-white/80 hover:text-white">
            Dashboard
          </Link>
        )}
        <span className="hidden text-white/80 sm:inline">{name}</span>
        <button type="button" onClick={logout} className="press flex min-h-11 items-center gap-1 text-white/80 hover:text-white">
          <LogOut size={14} aria-hidden /> Sign out
        </button>
      </div>
    </header>
  );
}
