"use client";
import { useEffect, useId, useState } from "react";

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

const DURATION = 900;
const FINAL_SECONDS = 7;

/** Cinta "REC 00:00:00" decorativa: cuenta hasta un valor fijo y termina en ENVIADO. aria-hidden. */
export function RecTape() {
  const [t, setT] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let raf = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raf = requestAnimationFrame(() => {
        setT(FINAL_SECONDS);
        setDone(true);
      });
      return () => cancelAnimationFrame(raf);
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / DURATION);
      setT(Math.round(p * FINAL_SECONDS));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDone(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const s = String(t).padStart(2, "0");
  return (
    <p aria-hidden="true" className="cs-rec cs-mono">
      <span className={`cs-dot cs-rec-dot${done ? " is-done" : ""}`} />
      <span>{done ? "ENVIADO" : "REC"}</span>
      <span className="cs-rec-tc">00:00:{s}</span>
    </p>
  );
}
