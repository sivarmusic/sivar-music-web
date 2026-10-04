"use client";
import { useEffect, useRef, type CSSProperties } from "react";

// Hash simple y determinista del nombre del proyecto -> alturas de barras (0..1).
function rand(seed: string, n: number) {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < n * 2; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    out.push(((h >>> 8) % 1000) / 1000);
  }
  return out;
}

export type WaveSize = "hero" | "md" | "sm";

/**
 * Firma de marca: ecualizador vivo. Las barras se levantan en cascada y luego respiran.
 * `flat` = casting cerrado (las barras bajan a línea); `error` = línea con un pico que parpadea;
 * `scan` = carga (barra viva que recorre). Con reduced-motion queda estática en su estado final.
 */
export default function Waveform({
  seed = "",
  flat = false,
  error = false,
  scan = false,
  size = "md",
  bars,
  className = "",
}: {
  seed?: string;
  flat?: boolean;
  error?: boolean;
  scan?: boolean;
  size?: WaveSize;
  bars?: number;
  className?: string;
}) {
  const n = bars ?? (size === "hero" ? 72 : size === "md" ? 48 : 32);
  const r = rand(seed, n);
  const wrap = useRef<HTMLDivElement | null>(null);

  // Pausa las animaciones infinitas cuando la onda sale de pantalla.
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => el.classList.toggle("is-paused", !e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const spike = Math.floor(n * 0.4);
  const state = error ? "cs-vu--error" : flat ? "cs-vu--flat" : scan ? "cs-vu--scan" : "cs-vu--live";
  return (
    <div ref={wrap} aria-hidden="true" className={`cs-vu cs-vu--${size} ${state} ${className}`.trim()}>
      {Array.from({ length: n }, (_, i) => {
        const env = 0.62 + 0.38 * Math.sin((Math.PI * (i + 0.5)) / n);
        const live = Math.min(0.94, 0.12 + r[i] * 0.8 * env + r[n + i] * 0.12);
        const isSpike = error && i >= spike - 1 && i <= spike + 2;
        const spikeH = [0.5, 1, 0.34, 0.72][i - (spike - 1)];
        const h = error ? (isSpike ? spikeH : 0.03) : flat ? 0.03 : scan ? 0.2 : live;
        const style = {
          "--h": h.toFixed(3),
          "--h0": live.toFixed(3),
          "--i": i,
          "--d": `${(1.5 + r[n + i] * 1.1).toFixed(2)}s`,
          "--k": (0.78 + r[i] * 0.34).toFixed(2),
        } as CSSProperties;
        return <i key={i} style={style} className={isSpike ? "is-spike" : undefined} />;
      })}
    </div>
  );
}
