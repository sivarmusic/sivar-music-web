"use client";
import { useEffect, useRef, type ReactNode } from "react";
import Arrow from "./Arrow";
import Waveform from "./Waveform";

/** Pantalla de confirmación: mono + H1 con foco + tabla con filetes (+ banda opcional). */
export default function ThanksView({
  heading,
  lead,
  project,
  next,
  backHref,
  band,
}: {
  heading: string;
  lead?: ReactNode;
  project?: string;
  next: ReactNode;
  backHref: string;
  band?: {
    title: string;
    text: string;
    primary: { href: string; label: string };
    secondary: { href: string; label: string };
  };
}) {
  const h1 = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    h1.current?.focus();
  }, []);
  return (
    <>
      <div className="cs-container py-10 md:py-16">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="cs-check">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="square" d="m4 12 6 6L20 6" />
            </svg>
          </span>
          <p className="cs-mono text-[13px]">Postulación enviada</p>
        </div>
        <h1 ref={h1} tabIndex={-1} className="cs-display cs-h1 mt-6 text-[60px] md:text-[96px] text-cs-ink">{heading}</h1>
        {lead ? <p className="mt-6 max-w-2xl text-[16px] text-cs-ink-2">{lead}</p> : null}

        <dl className="cs-table mt-12 max-w-3xl">
          {project ? (
            <div className="cs-table-row">
              <dt className="cs-mono">Proyecto</dt>
              <dd>{project}</dd>
            </div>
          ) : null}
          <div className="cs-table-row">
            <dt className="cs-mono">Qué sigue</dt>
            <dd>{next}</dd>
          </div>
        </dl>

        <a href={backHref} className="cs-link mt-8">
          <span aria-hidden="true">←</span> Volver al casting
        </a>
      </div>

      {band ? (
        <div className="cs-band cs-band--bleed">
          <div className="cs-container !py-0">
            <Waveform seed={project || band.title} className="h-12 w-full max-w-[420px] text-cs-paper" />
            <h2 className="cs-display mt-8 text-[48px]">{band.title}</h2>
            <p className="mt-6 max-w-xl text-[16px] text-cs-rule">{band.text}</p>
            <div className="mt-8 flex flex-col gap-4 md:flex-row">
              <a href={band.primary.href} className="cs-btn-paper">
                <span>{band.primary.label}</span>
                <Arrow />
              </a>
              <a href={band.secondary.href} className="cs-btn-secondary cs-btn-secondary--inv">{band.secondary.label}</a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
