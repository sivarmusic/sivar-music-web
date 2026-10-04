"use client";
import { useReveal } from "./useReveal";

/** Sección con filete que se dibuja, numeral gigante en contorno y reveal al scrollear. */
export default function Section({
  n,
  title,
  id,
  children,
}: {
  n?: number;
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} id={id} className="cs-section" aria-label={title}>
      <span aria-hidden="true" className="cs-rule" />
      <div className="cs-section-head">
        {n ? <span className="cs-section-n" aria-hidden="true">{String(n).padStart(2, "0")}</span> : null}
        <h2 className="cs-h2">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}
