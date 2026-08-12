"use client";

// Botón "Compartir" del reporte. Pide a la API un link firmado para el rango
// actual y lo copia al portapapeles. Cualquiera con el link ve el mismo reporte
// (la data es global, no depende del usuario), sin necesidad de iniciar sesión.
//
// Ported from voces-bds's app/components/reportes/CompartirButton.tsx.
//  - API: /api/reportes/share -> /api/voces/reportes/share.

import { useState } from "react";

const DIAS_OPCIONES = [7, 30, 90] as const;
const DIAS_DEFAULT = 7;

export default function CompartirButton({ desde, hasta }: { desde: string; hasta: string }) {
  const [open, setOpen] = useState(false);
  const [dias, setDias] = useState<number>(DIAS_DEFAULT);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const generar = async (d: number) => {
    setLoading(true);
    setError(null);
    setCopiado(false);
    try {
      const res = await fetch("/api/voces/reportes/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desde, hasta, dias: d }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || "No se pudo generar el link");
      setUrl(j.url as string);
      await copiar(j.url as string);
    } catch (e: any) {
      setError(e?.message || "Error");
      setUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const copiar = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el input queda visible para copiar a mano.
    }
  };

  const abrir = () => {
    setOpen(true);
    if (!url) generar(dias);
  };

  return (
    <>
      <button
        onClick={abrir}
        className="text-[13px] px-3 py-2 rounded-lg inline-flex items-center gap-2"
        style={{ color: "var(--color-text-secondary)", background: "var(--color-bg-subtle)" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        Compartir
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)" }}
          onClick={() => setOpen(false)}
        >
          <div className="ds-card p-6 w-full max-w-[460px]" onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-bg-base)" }}>
            <h3 className="text-[16px] font-[600] mb-1" style={{ color: "var(--color-text-primary)" }}>Compartir reporte</h3>
            <p className="text-[13px] mb-4" style={{ color: "var(--color-text-secondary)" }}>
              Link de solo lectura del rango {desde} — {hasta}. Quien lo abra ve exactamente este reporte, sin iniciar sesión.
            </p>
            <p className="text-[12px] mb-4" style={{ color: "var(--color-text-muted)" }}>
              Los emails de locutores y cantantes salen enmascarados en la vista compartida y en su Excel. El dato completo queda solo para admins con sesión.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {DIAS_OPCIONES.map((d) => {
                const isActive = dias === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { setDias(d); generar(d); }}
                    className="text-[12px] px-3 py-1.5 rounded-full transition-colors"
                    style={{
                      background: isActive ? "var(--color-accent-bg)" : "var(--color-bg-subtle)",
                      color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                      border: `0.5px solid ${isActive ? "var(--color-accent-border)" : "var(--color-border-subtle)"}`,
                    }}
                  >
                    Vence en {d} días
                  </button>
                );
              })}
            </div>

            {loading && <p className="text-[13px] mb-3" style={{ color: "var(--color-text-secondary)" }}>Generando link…</p>}
            {error && <p className="text-[12px] mb-3" style={{ color: "var(--color-accent)" }}>{error}</p>}

            {url && !loading && (
              <div className="flex gap-2 mb-4">
                <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="ds-input flex-1 text-[12px]" />
                <button type="button" onClick={() => copiar(url)} className="ds-btn-primary px-4 py-2 text-[13px] whitespace-nowrap">
                  {copiado ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
            )}

            <div className="flex justify-end">
              <button type="button" onClick={() => setOpen(false)} className="text-[13px] px-4 py-2 rounded-lg" style={{ color: "var(--color-text-secondary)", background: "var(--color-bg-subtle)" }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
