"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";

// Ported from voces-bds's app/admin/cantantes/casting/results/page.tsx.
//  - Auth: /api/auth/me -> useAuth(), same convention as the sibling
//    app/voces/admin/cantantes/casting/page.tsx built earlier in this batch.
//  - API: /api/admin/cantantes/casting/results -> /api/voces/admin/cantantes/casting/results.
//  - Links: /admin/cantantes/casting -> /voces/admin/cantantes/casting,
//    /admin/cantantes/casting/results/[shareId] -> /voces/admin/cantantes/casting/results/[shareId].
//  - Logo: /bds_music_logo.jpeg -> /SMG PNG.png (same swap as the locutor-side
//    app/voces/admin/casting/results/page.tsx).
export default function AdminCantantesCastingResultsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/voces/login");
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/voces/admin/cantantes/casting/results", { cache: "no-store" });
        const jr = await r.json();
        if (!r.ok || !jr?.ok) throw new Error(jr?.error || "Error");
        setItems(jr.results || []);
      } catch (e: any) {
        setError(e?.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  if (authLoading || !isAdmin) return <main className="p-6">Cargando…</main>;

  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-[500]" style={{ color: "var(--color-text-primary)" }}>Resultados — Castings de Cantantes</h1>
          </div>
          <a href="/voces/admin/cantantes/casting" className="ds-btn-secondary text-[12px] py-1.5 px-3">← Volver a castings</a>
        </div>
        {loading ? (
          <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>Cargando…</p>
        ) : error ? (
          <p className="text-[13px]" style={{ color: "var(--color-accent)" }}>{error}</p>
        ) : items.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>Aún no hay castings de cantantes</p>
        ) : (
          <section>
            <div className="mb-3 text-[13px]" style={{ color: "var(--color-text-muted)" }}>{items.length} castings</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {items.map((c) => {
                const count = c.applications?.length || 0;
                return (
                  <a key={c.id} href={`/voces/admin/cantantes/casting/results/${c.shareId}`} className="group rounded-[14px] overflow-hidden relative transition-all duration-200"
                    style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid var(--color-border-default)" }}>
                    <div className="h-[100px] flex items-center justify-center relative" style={{ background: "linear-gradient(to bottom, rgba(100,76,200,0.06), rgba(255,255,255,0.02))" }}>
                      <img src="/SMG PNG.png" alt="Sivar Music" className="h-9 w-auto opacity-30 group-hover:opacity-50 transition-opacity" />
                      <span className={`absolute top-2 right-2 rounded-full text-[11px] px-2.5 py-0.5 font-[500] ${count ? "bg-emerald-900/60 text-emerald-300" : "bg-white/5 text-gray-400"}`}>{count} post.</span>
                    </div>
                    <div className="px-4 py-3">
                      <div className="text-[14px] font-[500] truncate" style={{ color: "var(--color-text-primary)" }}>{c.title || "Sin título"}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{new Date(c.createdAt).toLocaleString()}</div>
                      <div className="mt-2 inline-flex items-center rounded-full text-[11px] px-2 py-0.5" style={{ background: count ? "rgba(74,222,128,0.06)" : "rgba(255,255,255,0.04)", color: count ? "#4ade80" : "var(--color-text-muted)" }}>
                        {count ? "Con postulaciones" : "Sin postulaciones"}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
