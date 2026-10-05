"use client";

// Modal "Mover postulaciones": muda postulaciones de un casting a otro del
// mismo tipo (locutores o cantantes). La validación real es del servidor
// (POST .../application/move); acá solo se arma la UI y el mensaje final.

import { useEffect, useId, useRef, useState } from "react";
import Modal from "./Modal";

type Kind = "locutor" | "cantante";

const ENDPOINTS: Record<Kind, { list: string; move: string }> = {
  locutor: { list: "/api/voces/admin/casting/list", move: "/api/voces/admin/casting/application/move" },
  cantante: { list: "/api/voces/admin/cantantes/casting/list", move: "/api/voces/admin/cantantes/casting/application/move" },
};

type CastingOption = { id: string; shareId: string; title: string; createdAt?: string | null };

function errorText(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message : "";
  return !msg || msg === "Failed to fetch" ? "Error de red. Probá de nuevo." : msg || fallback;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function buildMoveMessage(moved: number, skipped: { name: string; reason: string }[], copy: boolean): string {
  let msg = `${plural(moved, copy ? "postulación copiada" : "postulación movida", copy ? "postulaciones copiadas" : "postulaciones movidas")}.`;
  if (skipped.length) {
    const detail = skipped.map((s) => `${s.name} (${s.reason})`).join(", ");
    msg += ` ${plural(skipped.length, "omitida", "omitidas")}: ${detail}.`;
  }
  return msg;
}

export default function MoveApplicationsModal({
  open,
  onClose,
  kind,
  ids,
  currentCastingId,
  currentShareId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  kind: Kind;
  ids: string[];
  currentCastingId?: string | null;
  currentShareId?: string | null;
  /** Se llama con el mensaje de resultado tras mover; el padre refresca y cierra. */
  onDone: (message: string) => void;
}) {
  const selectId = useId();
  const [castings, setCastings] = useState<CastingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [targetId, setTargetId] = useState("");
  const [keepOriginal, setKeepOriginal] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqSeq = useRef(0);

  useEffect(() => {
    if (!open) return;
    const seq = ++reqSeq.current;
    setTargetId("");
    setKeepOriginal(true);
    setError(null);
    setLoadError(null);
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(ENDPOINTS[kind].list, { cache: "no-store" });
        const j = await r.json().catch(() => null);
        if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
        if (seq !== reqSeq.current) return;
        setCastings(Array.isArray(j.castings) ? j.castings : []);
      } catch (e) {
        if (seq === reqSeq.current) setLoadError(errorText(e, "No se pudieron cargar los castings"));
      } finally {
        if (seq === reqSeq.current) setLoading(false);
      }
    })();
    const ref = reqSeq;
    return () => { ref.current++; };
  }, [open, kind]);

  const options = castings.filter((c) => c.id !== currentCastingId && c.shareId !== currentShareId);
  const n = ids.length;

  async function submit() {
    if (!targetId || submitting || n === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(ENDPOINTS[kind].move, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, targetId, keepOriginal }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      onDone(buildMoveMessage(Number(j.moved) || 0, Array.isArray(j.skipped) ? j.skipped : [], keepOriginal));
    } catch (e) {
      setError(errorText(e, "No se pudo mover"));
    } finally {
      setSubmitting(false);
    }
  }

  const noOptions = !loading && !loadError && options.length === 0;

  return (
    <Modal open={open} onClose={onClose} title="Copiar o mover postulaciones" maxWidth="520px">
      <p className="text-[13px] mb-4" style={{ color: "var(--color-text-secondary)" }}>
        {keepOriginal
          ? <>Se copiarán {plural(n, "postulación", "postulaciones")} al casting que elijas. Quedarán en ambos castings y aparecerán en el link de resultados del destino. </>
          : <>Se moverán {plural(n, "postulación", "postulaciones")} al casting que elijas. Aparecerán en su link de resultados y dejarán de estar en este. </>}
        Si el email ya postuló en el destino, esa postulación se omite.
      </p>

      <label htmlFor={selectId} className="block text-[11px] font-[600] uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
        Casting destino
      </label>
      <select
        id={selectId}
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        disabled={loading || !!loadError || noOptions || submitting}
        className="ds-input [color-scheme:dark]"
      >
        <option value="">{loading ? "Cargando castings…" : "Elegí un casting…"}</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title || "Sin título"}{c.createdAt ? ` · ${new Date(c.createdAt).toLocaleDateString("es")}` : ""}
          </option>
        ))}
      </select>

      <label className="mt-4 flex items-center gap-2 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
        <input type="checkbox" checked={keepOriginal} onChange={(e) => setKeepOriginal(e.target.checked)} disabled={submitting} className="w-4 h-4 accent-[var(--color-accent)]" />
        Mantener también en este casting
      </label>

      <div aria-live="polite">
        {noOptions && (
          <p className="mt-3 text-[12px]" style={{ color: "var(--color-text-muted)" }}>
            No hay otros castings disponibles a los que mover.
          </p>
        )}
        {loadError && (
          <p role="alert" className="mt-3 text-[12px]" style={{ color: "var(--color-accent)" }}>
            Error al cargar los castings: {loadError}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-[12px]" style={{ color: "var(--color-accent)" }}>
            {error}
          </p>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="ds-btn-secondary text-[12px] py-1.5 px-4">Cancelar</button>
        <button
          type="button"
          onClick={submit}
          disabled={!targetId || submitting || n === 0}
          className="ds-btn-primary-solid disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (keepOriginal ? "Copiando…" : "Moviendo…") : keepOriginal ? "Copiar" : "Mover"}
        </button>
      </div>
    </Modal>
  );
}
