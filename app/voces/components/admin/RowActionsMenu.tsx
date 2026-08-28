"use client";

// Menú de tres puntos para acciones de fila en tablas de admin. Reemplaza
// filas con varios botones compitiendo por espacio (ver Clientes: hasta 3
// acciones por fila, antes de la etapa 3). La acción destructiva, si hay
// una, va separada por un divisor y en rojo — nunca mezclada con el resto.

import { useEffect, useRef, useState } from "react";

export type RowAction = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export default function RowActionsMenu({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const normal = actions.filter((a) => !a.destructive);
  const destructive = actions.filter((a) => a.destructive);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Más acciones"
        className="w-8 h-8 flex items-center justify-center rounded-[8px] transition-colors duration-150"
        style={{ color: "var(--color-text-muted)", background: open ? "var(--color-bg-subtle)" : "transparent" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 min-w-[160px] rounded-[10px] py-1.5 z-20"
          style={{
            background: "var(--color-bg-card)",
            border: "0.5px solid var(--color-border-default)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          {normal.map((a, i) => (
            <button
              key={i}
              role="menuitem"
              type="button"
              disabled={a.disabled}
              onClick={() => {
                setOpen(false);
                a.onClick();
              }}
              className="w-full text-left px-3.5 py-2 text-[13px] transition-colors duration-150 disabled:opacity-50"
              style={{ color: "var(--color-text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-subtle)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {a.label}
            </button>
          ))}

          {normal.length > 0 && destructive.length > 0 && (
            <div className="my-1 mx-3.5" style={{ borderTop: "0.5px solid var(--color-border-default)" }} />
          )}

          {destructive.map((a, i) => (
            <button
              key={i}
              role="menuitem"
              type="button"
              disabled={a.disabled}
              onClick={() => {
                setOpen(false);
                a.onClick();
              }}
              className="w-full text-left px-3.5 py-2 text-[13px] transition-colors duration-150 disabled:opacity-50"
              style={{ color: "var(--color-accent)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-accent-bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
