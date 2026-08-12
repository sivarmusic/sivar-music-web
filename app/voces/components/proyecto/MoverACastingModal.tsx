"use client";

// Ported from voces-bds's app/components/proyecto/MoverACastingModal.tsx.
// Modal para copiar integrantes de un proyecto hacia el resultado de un casting.
// Rutea por tipo: los cantantes van a castings de cantantes, los locutores a
// castings de locutores. Es copiar (no destructivo): los integrantes quedan en
// el proyecto y además se agregan como postulaciones del casting elegido.
//
// NOTE (batch 4 dependency): this is an admin-only affordance (gated behind
// isAdmin in the parent proyecto/[id] page) that talks to the *admin* casting
// endpoints, which are out of scope for this client-portal batch — they must
// be built in the admin batch at these exact paths:
//   /api/voces/admin/cantantes/casting/list
//   /api/voces/admin/cantantes/casting/application/create
//   /api/voces/admin/casting/list
//   /api/voces/admin/casting/application/create
// Until then this modal renders (no compile-time dependency) but "Copiar" will
// fail at runtime for admins.

import { useEffect, useMemo, useState } from "react";

type Casting = { id: string; title?: string; shareId: string; createdAt: string; status?: string | null };
type Tipo = "cantante" | "locutor";

const ENDPOINT: Record<Tipo, { list: string; create: string }> = {
  cantante: { list: "/api/voces/admin/cantantes/casting/list", create: "/api/voces/admin/cantantes/casting/application/create" },
  locutor: { list: "/api/voces/admin/casting/list", create: "/api/voces/admin/casting/application/create" },
};

// "Julieta Garcia" -> { firstName: "Julieta", lastName: "Garcia" }
function splitName(nombre: string): { firstName: string; lastName: string } {
  const tokens = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  const firstName = tokens[0] || "";
  const lastName = tokens.slice(1).join(" ") || "—";
  return { firstName, lastName };
}

export default function MoverACastingModal({
  open, onClose, items, onDone,
}: {
  open: boolean;
  onClose: () => void;
  items: any[];
  onDone: (summary: string) => void;
}) {
  const tiposPresentes = useMemo(() => {
    const set = new Set<Tipo>();
    items.forEach((it) => set.add(it.type === "cantante" ? "cantante" : "locutor"));
    return [...set];
  }, [items]);

  const [tipo, setTipo] = useState<Tipo>("cantante");
  const [castings, setCastings] = useState<Casting[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedShareId, setSelectedShareId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al abrir, arrancamos con el tipo predominante de la selección.
  useEffect(() => {
    if (open) {
      setTipo(tiposPresentes[0] || "cantante");
      setSelectedShareId("");
      setError(null);
    }
  }, [open, tiposPresentes]);

  // Cargar castings del tipo activo
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(ENDPOINT[tipo].list, { cache: "no-store" });
        const j = await r.json().catch(() => null);
        if (!cancelled) setCastings(j?.ok ? (j.castings || []) : []);
      } catch {
        if (!cancelled) setCastings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, tipo]);

  const itemsDelTipo = useMemo(() => items.filter((it) => (it.type === "cantante" ? "cantante" : "locutor") === tipo), [items, tipo]);
  const omitidos = items.length - itemsDelTipo.length;

  if (!open) return null;

  const confirmar = async () => {
    if (!selectedShareId) { setError("Elegí un casting de destino."); return; }
    if (!itemsDelTipo.length) { setError("No hay integrantes de este tipo en la selección."); return; }
    setBusy(true);
    setError(null);
    let ok = 0, fail = 0;
    for (const it of itemsDelTipo) {
      const { firstName, lastName } = splitName(it.nombre);
      try {
        const r = await fetch(ENDPOINT[tipo].create, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shareId: selectedShareId,
            firstName,
            lastName,
            country: it.pais || "",
            gender: it.genero || "",
            audioUrl: it.demo || null,
          }),
        });
        const j = await r.json().catch(() => null);
        if (r.ok && j?.ok) ok++; else fail++;
      } catch {
        fail++;
      }
    }
    setBusy(false);
    const parts = [`${ok} copiado${ok === 1 ? "" : "s"}`];
    if (fail) parts.push(`${fail} con error`);
    if (omitidos) parts.push(`${omitidos} de otro tipo omitido${omitidos === 1 ? "" : "s"}`);
    onDone(parts.join(" · "));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center px-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">Copiar a resultado de casting</h3>
        <p className="text-sm text-gray-600 mt-0.5 mb-4">
          {itemsDelTipo.length} integrante{itemsDelTipo.length === 1 ? "" : "s"} se agregarán como postulaciones.
          {omitidos > 0 && <span className="text-amber-600"> {omitidos} de otro tipo quedarán sin copiar.</span>}
        </p>

        {tiposPresentes.length > 1 && (
          <div className="flex gap-2 mb-4">
            {(["cantante", "locutor"] as Tipo[]).map((tp) => (
              <button key={tp} type="button" onClick={() => { setTipo(tp); setSelectedShareId(""); }}
                className={`text-sm px-3 py-1.5 rounded-full border ${tipo === tp ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-700 border-gray-300"}`}>
                {tp === "cantante" ? "Cantantes" : "Locutores"}
              </button>
            ))}
          </div>
        )}

        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 mb-4">
          {loading ? (
            <p className="text-sm text-gray-500 p-4">Cargando castings…</p>
          ) : castings.length === 0 ? (
            <p className="text-sm text-gray-500 p-4">No hay castings de {tipo === "cantante" ? "cantantes" : "locutores"}.</p>
          ) : (
            castings.map((c) => (
              <label key={c.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50">
                <input type="radio" name="casting" checked={selectedShareId === c.shareId} onChange={() => { setSelectedShareId(c.shareId); setError(null); }} />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-gray-900">{c.title || "(sin título)"}</span>
                  <span className="block text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString("es-AR")}</span>
                </span>
              </label>
            ))
          )}
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="text-sm px-4 py-2 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={confirmar} disabled={busy || !selectedShareId} className="text-sm px-5 py-2 rounded-lg text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50">
            {busy ? "Copiando…" : "Copiar"}
          </button>
        </div>
      </div>
    </div>
  );
}
