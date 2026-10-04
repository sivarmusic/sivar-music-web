"use client";
import { useEffect, useRef } from "react";

/** Tamaño tipo póster según el largo del título (clamp fluido, sin saltos de breakpoint). */
export function posterSize(t: string) {
  const n = t.length;
  if (n <= 10) return "clamp(84px, 24vw, 280px)";
  if (n <= 20) return "clamp(64px, 16vw, 210px)";
  if (n <= 32) return "clamp(54px, 14vw, 150px)";
  return "clamp(40px, 8.5vw, 112px)";
}

/**
 * H1 tipo cartel: cada palabra entra con máscara (translateY dentro de un recorte).
 * Un último token numérico (año) se dibuja en contorno. Sin JS ni animación queda visible.
 */
export default function PosterTitle({
  text,
  size,
  muted = false,
  focusOnMount = false,
  className = "",
}: {
  text: string;
  size?: string;
  muted?: boolean;
  focusOnMount?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    if (focusOnMount) ref.current?.focus({ preventScroll: true });
  }, [focusOnMount]);
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <h1
      ref={ref}
      tabIndex={focusOnMount ? -1 : undefined}
      className={`cs-display cs-poster cs-h1 ${muted ? "cs-poster--muted" : ""} ${className}`.trim()}
      style={{ fontSize: size ?? posterSize(text) }}
    >
      {words.map((w, i) => {
        const outline = words.length > 1 && i === words.length - 1 && /^\d{2,4}$/.test(w);
        return (
          <span key={`${w}-${i}`}>
            {i > 0 ? " " : null}
            <span className="cs-w">
              <span className={`cs-w-in${outline ? " cs-outline" : ""}`} style={{ ["--wi" as string]: i }}>
                {w}
              </span>
            </span>
          </span>
        );
      })}
    </h1>
  );
}
