"use client";

// Modal genérico para formularios de alta del admin (etapa 4 del rediseño):
// "Crear cliente", "Nuevo casting", etc. dejan de ocupar el lugar fijo
// arriba de la lista y pasan acá, disparados por un botón.
//
// Sin librerías nuevas — overlay + panel centrado, cierre por click afuera,
// Escape, o el botón de cerrar. Scrollea internamente si el contenido es más
// alto que la pantalla (los formularios de casting son largos).
//
// Foco y teclado (etapa 5): al abrir, el foco entra al panel; Tab/Shift+Tab
// quedan atrapados adentro (no se puede tabular "detrás" al contenido de la
// página); al cerrar, el foco vuelve a lo que estaba enfocado antes de abrir
// (normalmente el botón que disparó el modal).

import { useEffect, useRef } from "react";

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "480px",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  // onClose en un ref: los callers pasan una arrow inline (nueva identidad en
  // cada render). Si el efecto dependiera de ella, cada tecla tipada en un
  // input re-ejecutaría el efecto y robaría el foco hacia el botón de cerrar.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // Foco inicial: el primer elemento enfocable del panel (el botón de
    // cerrar), no un input — así Enter no dispara el submit del form apenas
    // se abre.
    if (panel) getFocusable(panel)[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && panel) {
        const focusable = getFocusable(panel);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[8vh] overflow-y-auto">
      <div
        className="fixed inset-0"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full rounded-[16px] max-h-[84vh] overflow-y-auto"
        style={{ maxWidth, background: "var(--color-bg-card)", border: "0.5px solid var(--color-border-default)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{ background: "var(--color-bg-card)", borderBottom: "0.5px solid var(--color-border-default)" }}
        >
          <h2 className="text-[15px] font-[500]" style={{ color: "var(--color-text-primary)" }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-150"
            style={{ background: "var(--color-bg-subtle)", color: "var(--color-text-muted)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
