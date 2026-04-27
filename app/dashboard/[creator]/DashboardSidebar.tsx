"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { type Creator } from "@/lib/creators";

const navItems: { label: string; icon: string; href: string; highlight?: boolean }[] = [
  { label: "Inicio", icon: "⌂", href: "" },
  { label: "Posts", icon: "▦", href: "/posts" },
  { label: "Constancia", icon: "◎", href: "/constancia" },
  { label: "Ideas IA", icon: "✦", href: "/ideas" },
  { label: "Asistente", icon: "◈", href: "/asistente" },
  { label: "Mi audiencia", icon: "◬", href: "/audiencia" },
  { label: "Calendario", icon: "▦", href: "/calendario" },
  { label: "Tendencias", icon: "↗", href: "/tendencias" },
  { label: "Actualizar stats", icon: "↑", href: "/actualizar", highlight: true },
];

export default function DashboardSidebar({ creator }: { creator: Creator }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const base = `/dashboard/${creator.slug}`;

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/members");
  }

  function isActive(href: string) {
    const full = base + href;
    if (href === "") return pathname === base || pathname === base + "/";
    return pathname.startsWith(full);
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-1 px-3 py-6">
      {/* Profile */}
      <div className="mb-4 flex items-center gap-3 px-3 pb-4 border-b border-white/8">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-base">
          {creator.emoji}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[0.8rem] font-bold text-white">
            {creator.displayName}
          </p>
          <p className="truncate text-[0.62rem] text-white/35">
            {creator.bio}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={base + item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.78rem] font-semibold transition-all ${
              isActive(item.href)
                ? "bg-white/10 text-white"
                : item.highlight
                ? "border border-white/10 text-white/60 hover:bg-white/5 hover:text-white/80"
                : "text-white/45 hover:bg-white/5 hover:text-white/80"
            }`}
          >
            <span className="text-sm opacity-70">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="mt-auto px-0 pt-4 border-t border-white/8">
        <p className="mb-2 px-3 text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-white/20">
          Sivar Music Group
        </p>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[0.78rem] font-semibold text-white/35 transition hover:bg-white/5 hover:text-white/60 disabled:opacity-40"
        >
          <span className="text-sm">↩</span>
          {loggingOut ? "Saliendo..." : "Cerrar sesión"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/6 bg-[#050505] lg:flex lg:flex-col">
        <div className="px-5 py-5 border-b border-white/6">
          <p className="text-[0.6rem] font-black uppercase tracking-[0.32em] text-white/25">
            Sivar Music Group
          </p>
          <p className="text-[0.68rem] font-semibold text-white/40">
            Dashboard
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-white/6 bg-[#050505]/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div>
          <p className="text-[0.58rem] font-black uppercase tracking-[0.28em] text-white/25">
            Sivar Music Group
          </p>
          <p className="text-[0.72rem] font-bold text-white">
            {creator.displayName} {creator.emoji}
          </p>
        </div>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70"
          aria-label="Toggle menu"
        >
          {mobileOpen ? "✕" : "≡"}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-white/8 bg-[#050505]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.28em] text-white/30">
                Dashboard
              </p>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
