"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/client";
import { LANGS } from "@/lib/langs";

export function AgentBar({ name, business, isOwner, lang }: { name: string; business: string; isOwner: boolean; lang: string }) {
  const router = useRouter();
  const [myLang, setMyLang] = useState(lang);
  async function changeLang(next: string) {
    const prev = myLang;
    setMyLang(next);
    const res = await api("/api/me", { method: "PATCH", body: { lang: next } });
    if (!res.ok) {
      setMyLang(prev);
      alert(res.error);
    }
  }
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
        <label className="flex items-center gap-1.5 text-white/80">
          <span className="hidden sm:inline">Translate chats to</span>
          <select
            aria-label="Translate chats to"
            value={myLang}
            onChange={(e) => changeLang(e.target.value)}
            className="min-h-8 rounded-sm bg-white/10 px-1.5 text-white [&>option]:text-ink"
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <span className="hidden text-white/80 sm:inline">{name}</span>
        <button type="button" onClick={logout} className="press flex min-h-11 items-center gap-1 text-white/80 hover:text-white">
          <LogOut size={14} aria-hidden /> Sign out
        </button>
      </div>
    </header>
  );
}
