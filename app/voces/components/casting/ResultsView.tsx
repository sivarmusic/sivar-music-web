"use client";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import PosterTitle, { fitSize } from "./PosterTitle";
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
        <div
          className={`cs-results-title${state === "loading" ? " is-loading" : ""}`}
          style={{ fontSize: `min(${fitSize(title, 88)}, clamp(44px, 12vw, 88px))` }}
        >
          <PosterTitle text={title} size="1em" className="mt-6" />
        </div>
        <p className="cs-mono cs-results-guide">
          {date ? <span>{date}</span> : null}
          <span>Escuchá las voces y respondé a tu ejecutivo de Sivar con tu elección.</span>
        </p>
      </div>
      <Waveform
        seed={title}
        scan={state === "loading"}
        error={state === "error"}
        size="hero"
        className={`cs-hero-wave cs-hero-wave--results ${state === "error" ? "text-cs-danger" : "text-cs-ink"}`}
      />
    </header>
  );
}

/** Título de grupo (el conteo ya va en el texto). */
export function ResultsHead({ children }: { children: ReactNode }) {
  return <span className="cs-h2">{children}</span>;
}

export function ResultsGroup({ title, children }: { title: string; children: ReactNode }) {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="cs-section cs-results-group" aria-label={title}>
      <span aria-hidden="true" className="cs-rule" />
      <h2 className="cs-section-head">
        <ResultsHead>{title}</ResultsHead>
      </h2>
      {children}
    </section>
  );
}

export type GenderFilterValue = "all" | "male" | "female";

/** Selector segmentado Todos / Hombres / Mujeres (radiogroup con flechas). Solo estado de UI. */
export function GenderFilter({
  value,
  onChange,
  counts,
}: {
  value: GenderFilterValue;
  onChange: (v: GenderFilterValue) => void;
  counts: { all: number; male: number; female: number };
}) {
  const opts: Array<{ v: GenderFilterValue; label: string; n: number }> = [
    { v: "all", label: "Todos", n: counts.all },
    { v: "male", label: "Hombres", n: counts.male },
    { v: "female", label: "Mujeres", n: counts.female },
  ];
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = opts.findIndex((o) => o.v === value);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % opts.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + opts.length) % opts.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = opts.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(opts[next].v);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label="Filtrar por género" className="cs-gf" onKeyDown={onKey}>
      {opts.map((o, i) => (
        <button
          key={o.v}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          tabIndex={value === o.v ? 0 : -1}
          className="cs-gf-opt"
          onClick={() => onChange(o.v)}
        >
          <span>{o.label}</span>
          <span className="cs-mono cs-gf-n">{o.n}</span>
        </button>
      ))}
    </div>
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
