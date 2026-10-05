"use client";
import type { ReactNode } from "react";
import PosterTitle from "./PosterTitle";
import Reveal from "./Reveal";
import Waveform from "./Waveform";
import { useReveal } from "./useReveal";

/** Portada de resultados: rótulo, título tipo póster, fecha y la onda como firma (una sola por pantalla). */
export function ResultsHero({
  title,
  createdAt,
  state,
}: {
  title: string;
  createdAt?: string | null;
  state: "loading" | "error" | "ready";
}) {
  const date = createdAt
    ? new Date(createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
    : null;
  return (
    <header className="cs-hero">
      <div className="cs-container cs-hero-in">
        <div className="cs-hero-meta">
          <span className="cs-mono cs-results-tag">Casting</span>
          <span aria-hidden="true" className="cs-mono cs-hero-reg">SIVAR MUSIC — RESULTADOS</span>
        </div>
        <PosterTitle text={title} className="mt-8" />
        {date ? <p className="cs-mono mt-6 text-[13px] text-cs-ink-2">{date}</p> : null}
      </div>
      <Waveform
        seed={title}
        scan={state === "loading"}
        error={state === "error"}
        size="hero"
        className={`cs-hero-wave ${state === "error" ? "text-cs-danger" : "text-cs-ink"}`}
      />
    </header>
  );
}

/** Grupo de fichas con numeral gigante (cantidad) y título. Se usa dentro de <section> o <details>. */
export function ResultsHead({ n, children }: { n: number; children: ReactNode }) {
  return (
    <>
      <span aria-hidden="true" className="cs-section-n">{String(n).padStart(2, "0")}</span>
      <span className="cs-h2">{children}</span>
    </>
  );
}

export function ResultsGroup({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="cs-section cs-results-group" aria-label={title}>
      <span aria-hidden="true" className="cs-rule" />
      <h2 className="cs-section-head">
        <ResultsHead n={n}>{title}</ResultsHead>
      </h2>
      {children}
    </section>
  );
}

/** Ficha de candidato: número, nombre en display, datos en mono y el reproductor/enlace como pieza principal. */
export function CandidateCard({
  index,
  name,
  highlighted,
  meta,
  children,
}: {
  index: number;
  name: string;
  highlighted?: boolean;
  meta: ReactNode;
  children: ReactNode;
}) {
  return (
    <Reveal className="cs-card-wrap" delay={Math.min(index, 3) * 70}>
      <article className={`cs-card${highlighted ? " cs-card--hl" : ""}`}>
        <div className="cs-card-in">
        <div className="cs-card-top">
          <span aria-hidden="true" className="cs-mono cs-card-n">{String(index + 1).padStart(2, "0")}</span>
          {highlighted ? <span className="cs-mono cs-card-tag">Shortlist</span> : null}
        </div>
        <h3 className="cs-card-name">{name}</h3>
        <div className="cs-card-meta cs-mono">{meta}</div>
        <div className="cs-aud">{children}</div>
        </div>
      </article>
    </Reveal>
  );
}
