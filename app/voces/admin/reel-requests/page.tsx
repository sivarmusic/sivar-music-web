"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";

// Ported from voces-bds's app/admin/reel-requests/page.tsx.
//  - Auth: /api/auth/me -> useAuth(), self-gated client-side, redirects to
//    /voces/login when not admin (instead of inline "Solo admins" text).
//  - API routes: /api/admin/reel-requests* -> /api/voces/admin/reel-requests*.
//  - Kept the original's light Tailwind admin styling as-is (this page
//    predates the ds-* dark theme used elsewhere in voces-bds; not
//    redesigned here to keep the port faithful).

type ReelRequest = {
  id: string;
  createdAt: string;
  status: string;
  talentId: string;
  talentName: string;
  email: string;
  mode: "replace" | "add";
  targetKind: string | null;
  targetMediaId: string | null;
  previousAudioUrl: string | null;
  newAudioUrl: string;
  newAudioFilename: string | null;
};

export default function AdminReelRequestsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReelRequest[]>([]);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
      const r = await fetch("/api/voces/admin/reel-requests?status=pending", { cache: "no-store" });
      const j = await r.json();
      if (r.ok && j?.ok) setItems(j.requests || []);
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: string) {
    if (!window.confirm("¿Aprobar esta solicitud? El audio anterior será reemplazado y descartado.")) return;
    setWorkingId(id);
    try {
      const r = await fetch("/api/voces/admin/reel-requests/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        setToast(j?.error || "Error al aprobar");
      } else {
        setToast("Aprobado y aplicado");
        await refresh();
      }
    } catch (e: any) {
      setToast(e?.message || "Error");
    } finally {
      setWorkingId(null);
      setTimeout(() => setToast(null), 2500);
    }
  }

  async function reject(id: string) {
    const notes = window.prompt("Motivo del rechazo (opcional):") || "";
    if (notes === null) return;
    setWorkingId(id);
    try {
      const r = await fetch("/api/voces/admin/reel-requests/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        setToast(j?.error || "Error al rechazar");
      } else {
        setToast("Solicitud rechazada");
        await refresh();
      }
    } catch (e: any) {
      setToast(e?.message || "Error");
    } finally {
      setWorkingId(null);
      setTimeout(() => setToast(null), 2500);
    }
  }

  if (authLoading || !isAdmin) return <main className="p-6">Cargando…</main>;

  return (
    <>
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Solicitudes de actualización de reel</h1>
              <p className="text-sm text-gray-600 mt-1">Revisá los nuevos audios enviados por los locutores.</p>
            </div>
            <button onClick={refresh} className="text-sm rounded border border-gray-300 px-3 py-1.5 bg-white hover:bg-gray-50">
              Refrescar
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-600">Cargando…</p>
          ) : items.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-600">No hay solicitudes pendientes.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((req) => (
                <li key={req.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="font-semibold text-gray-900">{req.talentName}</div>
                      <div className="text-xs text-gray-500">{req.email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Enviado: {new Date(req.createdAt).toLocaleString()}
                      </div>
                      <div className="mt-2">
                        <span className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
                          style={{
                            background: req.mode === "replace" ? "#fef3c7" : "#dbeafe",
                            color: req.mode === "replace" ? "#92400e" : "#1e40af",
                          }}>
                          {req.mode === "replace"
                            ? `Reemplazar ${req.targetKind === "voice_demo_2" ? "demo adicional" : "demo principal"}`
                            : "Agregar demo extra"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {req.previousAudioUrl ? (
                      <div className="rounded-lg p-3 bg-gray-50 border border-gray-200">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                          Audio actual {req.targetKind === "voice_demo_2" ? "(adicional)" : "(principal)"}
                        </div>
                        <audio controls src={req.previousAudioUrl} className="w-full" />
                      </div>
                    ) : (
                      <div className="rounded-lg p-3 bg-gray-50 border border-gray-200 text-xs text-gray-500 flex items-center justify-center">
                        Sin audio previo (alta nueva)
                      </div>
                    )}
                    <div className="rounded-lg p-3 border" style={{ background: "#f0fdf4", borderColor: "#86efac" }}>
                      <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#166534" }}>
                        Nuevo audio propuesto
                      </div>
                      {req.newAudioFilename && (
                        <div className="text-[11px] text-gray-600 mb-1 truncate">{req.newAudioFilename}</div>
                      )}
                      <audio controls src={req.newAudioUrl} className="w-full" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button onClick={() => reject(req.id)} disabled={workingId === req.id}
                      className={`rounded border px-3 py-1.5 text-xs ${workingId === req.id ? "border-red-200 text-red-300 cursor-not-allowed" : "border-red-300 text-red-700 hover:bg-red-50"}`}>
                      Rechazar
                    </button>
                    <button onClick={() => approve(req.id)} disabled={workingId === req.id}
                      className={`rounded px-3 py-1.5 text-xs text-white ${workingId === req.id ? "bg-green-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}>
                      Aprobar y aplicar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-3 py-2 rounded-md shadow-lg z-[120]">
          {toast}
        </div>
      )}
    </>
  );
}
