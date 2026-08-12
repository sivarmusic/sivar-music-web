"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";

// Ported from voces-bds's app/admin/trash/page.tsx.
//  - Auth: /api/auth/me -> useAuth(), self-gated, redirects to /voces/login.
//  - API routes: /api/admin/trash/* -> /api/voces/admin/trash/*.
//  - "Volver a castings" now points at /voces/admin/casting (that page is
//    built by the casting-management batch, not this one).
//
// NOTE: in the original app this trash only ever held soft-deleted castings
// (store.json's `trash` array), and nothing in the original actually wrote
// to it anymore — /api/admin/casting/delete hard-deletes straight from
// Supabase, so store.trash was permanently empty dead code by the time of
// this port. This port backs the same list/restore/purge routes with a new
// voces_trash table (see scripts/voces-schema.sql) instead of dropping the
// feature outright, so it's ready the moment a future delete flow (batch
// 4b's admin/casting) starts writing snapshots into it. Until then this
// page will legitimately show an empty trash.

export default function AdminTrashPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/voces/login");
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/voces/admin/trash/list", { cache: "no-store" });
      const j = await r.json();
      if (r.ok && j?.ok) setItems(j.trash || []);
    } finally {
      setLoading(false);
    }
  }

  async function restore(id: string) {
    setWorkingId(id);
    try {
      const r = await fetch("/api/voces/admin/trash/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        setToast(j?.error || "Error al restaurar");
        setTimeout(() => setToast(null), 2500);
        return;
      }
      await refresh();
      setToast("Restaurado");
      setTimeout(() => setToast(null), 1800);
    } catch (e: any) {
      setToast(e?.message || "Error");
      setTimeout(() => setToast(null), 2500);
    } finally {
      setWorkingId(null);
    }
  }

  async function purge(id: string) {
    if (typeof window !== 'undefined' && !window.confirm('¿Eliminar definitivamente? Esta acción no se puede deshacer.')) return;
    setWorkingId(id);
    try {
      const r = await fetch("/api/voces/admin/trash/purge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        setToast(j?.error || "Error eliminando");
        setTimeout(() => setToast(null), 2500);
        return;
      }
      await refresh();
      setToast("Eliminado definitivamente");
      setTimeout(() => setToast(null), 1800);
    } catch (e: any) {
      setToast(e?.message || "Error");
      setTimeout(() => setToast(null), 2500);
    } finally {
      setWorkingId(null);
    }
  }

  if (authLoading || !isAdmin) return <main className="p-6">Cargando…</main>;

  return (
    <>
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Papelera</h1>
          <a href="/voces/admin/casting" className="text-sm underline text-gray-700">Volver a castings</a>
        </div>
        {loading ? (
          <p className="text-sm text-gray-600">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-600">La papelera está vacía</p>
        ) : (
          <ul className="space-y-3">
            {items.map((t) => (
              <li key={t.id} className="bg-white border border-gray-200 rounded-xl p-4">
                {t.type === 'casting' ? (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900">Casting: {t.casting?.title || 'Sin título'}</div>
                      <div className="text-xs text-gray-500">Eliminado: {new Date(t.deletedAt).toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Postulaciones: {t.applications?.length || 0}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>restore(t.id)} disabled={workingId===t.id} className={`rounded border px-3 py-1 text-xs ${workingId===t.id? 'border-green-200 text-green-300 cursor-not-allowed' : 'border-green-300 text-green-700 hover:bg-green-50'}`}>Restaurar</button>
                      <button onClick={()=>purge(t.id)} disabled={workingId===t.id} className={`rounded border px-3 py-1 text-xs ${workingId===t.id? 'border-red-200 text-red-300 cursor-not-allowed' : 'border-red-300 text-red-700 hover:bg-red-50'}`}>Eliminar</button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
    {toast ? (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-3 py-2 rounded-md shadow-lg z-[120]">{toast}</div>
    ) : null}
    </>
  );
}
