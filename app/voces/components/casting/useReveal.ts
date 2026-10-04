"use client";
import { useEffect, useLayoutEffect, useRef } from "react";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Reveal al entrar en pantalla (una sola vez). El estado oculto (.cs-rv) se
 * aplica por JS y solo si el usuario no pidió reducir el movimiento, así que el
 * contenido nunca queda invisible si falla el script o hay reduced-motion.
 */
export function useReveal<T extends HTMLElement>(delayMs = 0) {
  const ref = useRef<T | null>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (delayMs) el.style.setProperty("--rv-delay", `${delayMs}ms`);
    el.classList.add("cs-rv");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delayMs]);
  return ref;
}
