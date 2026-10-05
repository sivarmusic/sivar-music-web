"use client";
import { useEffect, type ReactNode } from "react";
import Arrow from "./Arrow";
import { SentStamp, Seal } from "./Ceremony";
import PosterTitle, { fitSize } from "./PosterTitle";
import Reveal from "./Reveal";
import Waveform from "./Waveform";

/** Pantalla de confirmación como ceremonia: portada azul + onda + sello, tabla en papel y banda tinta opcional. */
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
  // Al llegar desde el formulario el scroll quedaba a mitad de página (el tema
  // usa scroll-behavior: smooth y eso interrumpe el reseteo de Next): subir
  // siempre hasta arriba, con animación salvo que el usuario pida menos movimiento.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, left: 0, behavior: reduce ? "instant" : "smooth" });
  }, []);
  return (
    <>
      <section className="cs-slab cs-slab--blue cs-on-blue cs-thanks">
        <div className="cs-container">
          <div className="cs-thanks-top">
            <Seal />
            <div className="cs-thanks-status">
              <p className="cs-mono text-[13px]">Postulación enviada</p>
              <SentStamp />
            </div>
          </div>
          <PosterTitle text={heading} size={fitSize(heading)} focusOnMount className="cs-thanks-h1" />
          {lead ? <p className="cs-thanks-lead">{lead}</p> : null}
        </div>
        <Waveform seed={project || heading} size="hero" className="cs-thanks-wave" />
      </section>

      <div className="cs-container py-12 md:py-16">
        <Reveal>
          <dl className="cs-table max-w-3xl">
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
        </Reveal>
      </div>

      {band ? (
        <div className="cs-band cs-band--bleed">
          <div className="cs-container !py-0">
            <Reveal>
              <span aria-hidden="true" className="cs-band-rule" />
              <h2 className="cs-display cs-band-title mt-8">{band.title}</h2>
              <p className="mt-6 max-w-xl text-[16px] text-cs-rule">{band.text}</p>
              <div className="mt-8 flex flex-col gap-4 md:flex-row">
                <a href={band.primary.href} className="cs-btn-paper">
                  <span>{band.primary.label}</span>
                  <Arrow />
                </a>
                <a href={band.secondary.href} className="cs-btn-secondary cs-btn-secondary--inv">{band.secondary.label}</a>
              </div>
            </Reveal>
          </div>
        </div>
      ) : null}
    </>
  );
}
