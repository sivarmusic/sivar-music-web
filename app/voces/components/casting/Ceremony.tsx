"use client";
import { useId, useRef, useSyncExternalStore } from "react";

/** Sello circular "RECIBIDO" con texto en círculo; gira lento (solo con motion permitido). Decorativo. */
export function Seal() {
  const uid = useId().replace(/:/g, "");
  return (
    <svg aria-hidden="true" className="cs-seal" viewBox="0 0 120 120" width="96" height="96">
      <defs>
        <path id={`${uid}-ring`} d="M60 60 m-47 0 a47 47 0 1 1 94 0 a47 47 0 1 1 -94 0" />
      </defs>
      <g className="cs-seal-rot">
        <circle cx="60" cy="60" r="58" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="36" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <text fontSize="10" fill="currentColor" fontFamily="var(--font-geist-mono), monospace" fontWeight="600">
          <textPath href={`#${uid}-ring`} textLength="292" lengthAdjust="spacing">RECIBIDO · SIVAR MUSIC · CASTING ·</textPath>
        </text>
      </g>
      <path d="m44 61 11 11 21-23" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="square" />
    </svg>
  );
}

const noopSubscribe = () => () => {};

function formatNow() {
  const d = new Date();
  const date = d.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" }).replace(".", "");
  const time = d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} · ${time}`;
}

/** Sello de envío: fecha y hora reales en que el postulante llegó a esta pantalla (hora local del dispositivo). */
export function SentStamp() {
  // La hora depende del dispositivo: en el servidor no se renderiza (snapshot
  // null) y el cliente la fija una sola vez al montar, sin desajuste de hidratación.
  const fixed = useRef<string | null>(null);
  const when = useSyncExternalStore(
    noopSubscribe,
    () => (fixed.current ??= formatNow()),
    () => null,
  );
  return (
    <p className="cs-rec cs-mono">
      <span className="cs-dot cs-rec-dot is-done" aria-hidden="true" />
      <span>ENVIADO</span>
      {when ? <span className="cs-rec-tc">{when}</span> : null}
    </p>
  );
}
