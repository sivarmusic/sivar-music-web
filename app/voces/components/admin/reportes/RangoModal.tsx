"use client";

// Modal de selección de rango de fechas para generar el reporte.
// Reutilizable: se usa desde el botón "Generar Reporte" del panel y desde
// el botón "Nuevo rango" dentro del reporte.
//
// Ported verbatim from voces-bds's app/components/reportes/RangoModal.tsx.

import { useEffect, useState } from "react";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Presets → [desde, hasta] en YYYY-MM-DD
function preset(kind: "7d" | "mes" | "anio" | "todo"): [string, string] {
  const now = new Date();
  const hasta = todayStr();
  if (kind === "7d") {
    const d = new Date(now.getTime() - 6 * 24 * 3600 * 1000);
    return [d.toISOString().slice(0, 10), hasta];
  }
  if (kind === "mes") {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return [d.toISOString().slice(0, 10), hasta];
  }
  if (kind === "anio") {
    const d = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return [d.toISOString().slice(0, 10), hasta];
  }
  return ["2000-01-01", hasta]; // todo el tiempo
}

const PRESETS: { kind: "7d" | "mes" | "anio" | "todo"; label: string }[] = [
  { kind: "7d", label: "Últimos 7 días" },
  { kind: "mes", label: "Este mes" },
  { kind: "anio", label: "Este año" },
  { kind: "todo", label: "Todo el tiempo" },
];

export default function RangoModal({
  open, onClose, onConfirm, initialDesde, initialHasta,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (desde: string, hasta: string) => void;
  initialDesde?: string;
  initialHasta?: string;
}) {
  const [desde, setDesde] = useState(initialDesde || preset("mes")[0]);
  const [hasta, setHasta] = useState(initialHasta || todayStr());
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDesde(initialDesde || preset("mes")[0]);
      setHasta(initialHasta || todayStr());
      setActive(null);
      setError(null);
    }
  }, [open, initialDesde, initialHasta]);

  if (!open) return null;

  const applyPreset = (kind: "7d" | "mes" | "anio" | "todo") => {
    const [d, h] = preset(kind);
    setDesde(d); setHasta(h); setActive(kind); setError(null);
  };

  const submit = () => {
    if (!desde || !hasta) { setError("Elegí ambas fechas."); return; }
    if (desde > hasta) { setError("La fecha 'desde' no puede ser posterior a 'hasta'."); return; }
    onConfirm(desde, hasta);
  };

  const dsLabel = "block text-[11px] font-[500] mb-1.5 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)" }} onClick={onClose}>
      <div className="ds-card p-6 w-full max-w-[420px]" onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-bg-base)" }}>
        <h3 className="text-[16px] font-[600] mb-1" style={{ color: "var(--color-text-primary)" }}>Generar reporte</h3>
        <p className="text-[13px] mb-4" style={{ color: "var(--color-text-secondary)" }}>Elegí el rango de fechas a analizar.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((p) => {
            const isActive = active === p.kind;
            return (
              <button key={p.kind} type="button" onClick={() => applyPreset(p.kind)}
                className="text-[12px] px-3 py-1.5 rounded-full transition-colors"
                style={{
                  background: isActive ? "var(--color-accent-bg)" : "var(--color-bg-subtle)",
                  color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                  border: `0.5px solid ${isActive ? "var(--color-accent-border)" : "var(--color-border-subtle)"}`,
                }}>
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Desde</label>
            <input type="date" value={desde} max={hasta} onChange={(e) => { setDesde(e.target.value); setActive(null); }} className="ds-input" style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Hasta</label>
            <input type="date" value={hasta} min={desde} max={todayStr()} onChange={(e) => { setHasta(e.target.value); setActive(null); }} className="ds-input" style={{ colorScheme: "dark" }} />
          </div>
        </div>

        {error && <p className="text-[12px] mb-3" style={{ color: "var(--color-accent)" }}>{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="text-[13px] px-4 py-2 rounded-lg" style={{ color: "var(--color-text-secondary)", background: "var(--color-bg-subtle)" }}>Cancelar</button>
          <button type="button" onClick={submit} className="ds-btn-primary px-5 py-2 text-[13px]">Generar</button>
        </div>
      </div>
    </div>
  );
}
