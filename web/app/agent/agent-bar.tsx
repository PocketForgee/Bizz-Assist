"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Languages, LogOut } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/client";
import { LANGS } from "@/lib/langs";
import { Wordmark } from "@/components/brand";

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
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-hairline bg-canvas px-4">
      <Wordmark href={isOwner ? "/app" : "/agent"} />
      <span className="hidden h-5 w-px bg-hairline sm:block" aria-hidden />
      <span className="hidden truncate text-[14px] text-ink-48 sm:inline">{business}</span>
      <div className="ml-auto flex items-center gap-1">
        {isOwner && (
          <Link href="/app" className="press hidden min-h-9 items-center rounded-md px-3 text-[14px] text-ink-80 hover:bg-parchment hover:text-ink sm:inline-flex">
            Dashboard
          </Link>
        )}
        <label className="press flex min-h-9 items-center gap-2 rounded-md px-2 text-[14px] text-ink-80 hover:bg-parchment" title="Customer messages are translated into this language">
          <Languages size={16} strokeWidth={1.5} className="text-ink-48" aria-hidden />
          <span className="hidden md:inline">Translate to</span>
          <select aria-label="Translate chats to" value={myLang} onChange={(e) => changeLang(e.target.value)} className="cursor-pointer bg-transparent font-medium text-ink focus:outline-none">
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <span className="mx-2 hidden h-5 w-px bg-hairline sm:block" aria-hidden />
        <span aria-hidden className="hidden size-8 items-center justify-center rounded-full bg-ink text-[12px] font-medium text-white sm:flex">
          {name.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <button type="button" onClick={logout} aria-label="Sign out" title="Sign out" className="press flex size-9 items-center justify-center rounded-md text-ink-48 hover:bg-parchment hover:text-ink">
          <LogOut size={16} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
    </header>
  );
}
