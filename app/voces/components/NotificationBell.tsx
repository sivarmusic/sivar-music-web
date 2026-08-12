"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/app/voces/components/AuthContext";

type Pending = { id: string; nombre: string; createdAt: string | null; slug?: string };

export default function NotificationBell() {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Pending[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const SEEN_KEY = "voces_pending_seen_v1";
  const intervalRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      if (raw) setSeen(new Set(JSON.parse(raw)));
    } catch {}
    refresh();
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [isAdmin]);

  async function refresh() {
    setLoading(true);
    try {
      // NOTE: /api/voces/admin/pending is built by the admin batch — this
      // fetch is a no-op (returns nothing) until that route exists.
      const r = await fetch("/api/voces/admin/pending", { cache: "no-store" });
      const j = await r.json();
      if (j?.ok) {
        const list: Pending[] = Array.isArray(j.pending) ? j.pending : [];
        list.sort((a, b) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bt - at;
        });
        setItems(list);
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (!isAdmin) return;
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(refresh, 60000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [isAdmin]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function markSeen(id: string) {
    setSeen((prev) => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }

  function markAllSeen() {
    setSeen((prev) => {
      const next = new Set(prev);
      for (const it of items) next.add(it.id);
      try { localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }

  if (!isAdmin) return null;
  const unseen = items.filter((it) => !seen.has(it.id));
  const count = unseen.length;

  function timeAgo(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    const divs: [number, Intl.RelativeTimeFormatUnit][] = [
      [60, "second"], [60, "minute"], [24, "hour"], [7, "day"], [4.34524, "week"], [12, "month"],
    ];
    const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
    let duration = diff;
    for (const [amount, unit] of divs) {
      if (Math.abs(duration) < amount) return rtf.format(-Math.round(duration), unit);
      duration /= amount;
    }
    return rtf.format(-Math.round(duration), "year");
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        aria-label="Notificaciones"
        onClick={() => { setOpen((s) => { const next = !s; if (next) refresh(); return next; }); }}
        className="relative rounded-full p-2 transition-colors duration-200 hover:bg-white/[0.06]"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M12 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 006 14h12a1 1 0 00.707-1.707L18 11.586V8a6 6 0 00-6-6zm0 20a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        {count > 0 && (
          <span
            className="absolute -top-1 -right-1 text-[10px] leading-none px-1.5 py-0.5 rounded-full text-white font-[500]"
            style={{ background: "var(--color-accent)" }}
          >
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-[14px] z-50 overflow-hidden"
          style={{ background: "rgba(18,18,20,0.98)", border: "0.5px solid var(--color-border-default)" }}
        >
          <div
            className="px-4 py-3 text-[13px] font-[500]"
            style={{ borderBottom: "0.5px solid var(--color-border-default)", color: "var(--color-text-primary)" }}
          >
            Notificaciones
          </div>
          <div className="max-h-80 overflow-auto">
            {loading ? (
              <div className="p-4 text-[13px]" style={{ color: "var(--color-text-muted)" }}>Cargando…</div>
            ) : count === 0 ? (
              <div className="p-4 text-[13px]" style={{ color: "var(--color-text-muted)" }}>Sin nuevas entradas</div>
            ) : (
              unseen.map((it) => (
                <div
                  key={it.id}
                  className="px-4 py-3"
                  style={{ borderBottom: "0.5px solid var(--color-border-default)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-[500] truncate" style={{ color: "var(--color-text-primary)" }} title={it.nombre}>{it.nombre}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: "var(--color-accent)" }}>
                        Nueva entrada {it.createdAt ? `· ${timeAgo(it.createdAt)}` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => { markSeen(it.id); window.location.href = it.slug ? `/voces/locutor/${it.slug}` : "/voces/admin/clients#locutores"; }}
                      className="ds-btn-primary shrink-0 text-[11px] py-1.5 px-3"
                    >
                      Revisar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div
            className="flex items-center justify-between gap-3 px-4 py-3"
            style={{ borderTop: "0.5px solid var(--color-border-default)" }}
          >
            <button
              onClick={markAllSeen}
              className="ds-btn-secondary text-[11px] py-1.5 px-3"
            >
              Marcar vistas
            </button>
            <a href="/voces/admin/clients#locutores" className="ds-btn-primary text-[11px] py-1.5 px-3">
              Ver lista
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
