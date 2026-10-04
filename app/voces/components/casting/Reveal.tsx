"use client";
import type { ReactNode } from "react";
import { useReveal } from "./useReveal";

/** Envuelve contenido para que aparezca con fade + desplazamiento al entrar en pantalla. */
export default function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useReveal<HTMLDivElement>(delay);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
