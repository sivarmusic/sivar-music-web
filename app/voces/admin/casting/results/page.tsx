"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";
import Breadcrumbs from "@/app/voces/components/Breadcrumbs";

// Ported from voces-bds's app/admin/casting/results/page.tsx.
//  - Auth: /api/auth/me -> useAuth().
//  - API: /api/admin/casting/results -> /api/voces/admin/casting/results.
//  - Logo: /bds_music_logo.jpeg -> /SMG PNG.png (Sivar Music mark used
//    elsewhere in this batch, e.g. lib/voces-email.ts's email templates).
export default function AdminCastingResultsPage() {
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
        const r = await fetch("/api/voces/admin/casting/results", { cache: "no-store" });
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
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <Breadcrumbs
          items={[{ label: "Castings", href: "/voces/admin/casting" }, { label: "Resultados" }]}
          className="text-blue-700 mb-2 px-1"
        />
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Resultados de castings</h1>
          <a href="/voces/admin/casting" className="text-sm underline text-gray-700">Volver a castings</a>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-gray-600">Cargando…</p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">Aún no hay castings</p>
        ) : (
          <section className="mt-6">
            <div className="mb-3 text-sm text-gray-500">{items.length} castings</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {items.map((c) => {
                const count = c.applications?.length || 0;
                const status = count ? "Con postulaciones" : "Sin postulaciones";
                return (
                  <a key={c.id} href={`/voces/admin/casting/results/${c.shareId}`} className="group rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow transition relative">
                    <div className="aspect-video w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                      <img src="/SMG PNG.png" alt="Sivar Music" className="h-10 w-auto opacity-80" />
                      <span className={`absolute top-2 right-2 rounded-full text-xs px-2 py-1 ${count ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700"}`}>
                        {count} post.
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900 truncate group-hover:text-brand-600">{c.title || "Sin título"}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{new Date(c.createdAt).toLocaleString()}</div>
                      <div className="mt-2 inline-flex items-center rounded-full bg-gray-50 text-gray-600 text-[11px] px-2 py-1">
                        {status}
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
