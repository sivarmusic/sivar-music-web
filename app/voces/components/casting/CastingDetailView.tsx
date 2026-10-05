"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Arrow from "./Arrow";
import PosterTitle from "./PosterTitle";
import Reveal from "./Reveal";
import Section from "./Section";
import StatusDot from "./StatusDot";
import Timecode from "./Timecode";
import Waveform from "./Waveform";
import { formatDeadline, useCountdown } from "./useCountdown";

export type DetailSection = {
  key: string;
  title: string;
  node: ReactNode;
  /** Línea compacta sin número (p. ej. "Sin video"). */
  compact?: boolean;
};

export function CastingSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="cs-container pt-10 md:pt-16">
        <div className="cs-skel h-4 w-32" />
        <div className="cs-skel mt-6 h-24 w-full md:h-40" />
      </div>
      <Waveform scan size="hero" className="mt-8 text-cs-ink" />
      <div className="cs-container py-10 md:py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-6">
            <div className="cs-skel h-5 w-64 max-w-full" />
            <div className="cs-skel h-16 w-full" />
          </div>
          <div className="lg:col-span-7 space-y-6">
            <div className="cs-skel h-24 w-full" />
            <div className="cs-skel h-64 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CastingErrorState({ message }: { message: string }) {
  const retry = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    retry.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div>
      <div className="cs-container pt-10 md:pt-16">
        <p className="cs-mono cs-err-code text-[13px]" aria-hidden="true">SIN SEÑAL</p>
        <p className="cs-mono mt-3 text-[13px] text-cs-danger">Error</p>
        <h1 className="cs-display cs-poster mt-3 text-cs-ink" style={{ fontSize: "clamp(56px, 13vw, 160px)" }}>No disponible</h1>
      </div>
      <Waveform error size="hero" className="mt-8 text-cs-danger" />
      <div className="cs-container pb-10 md:pb-16">
        <p role="alert" className={message === "No disponible" ? "sr-only" : "mt-8 max-w-xl text-[16px] text-cs-ink-2"}>{message}</p>
        <button ref={retry} type="button" className="cs-btn-secondary mt-8" onClick={() => window.location.reload()}>
          Reintentar
        </button>
      </div>
    </div>
  );
}

export default function CastingDetailView({
  item,
  applyHref,
  sections,
  closedNext,
}: {
  item: { title?: string; brief?: string; deadline?: string | null };
  applyHref: string;
  sections: DetailSection[];
  /** Salida del estado cerrado con destinos/textos ya existentes. */
  closedNext?: {
    title: string;
    text: string;
    primary: { href: string; label: string };
    secondary: { href: string; label: string };
  };
}) {
  const isOpen = !item?.deadline || new Date() < new Date(item.deadline);
  const countdown = useCountdown(item?.deadline);
  const title: string = item.title || "Sin título";
  const heroRef = useRef<HTMLElement | null>(null);
  const [heroGone, setHeroGone] = useState(false);

  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setHeroGone(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const dl = item.deadline ? formatDeadline(item.deadline) : null;
  const today = isOpen && countdown && countdown.days === 0 && !countdown.expired;
  const timerLabel = dl ? `${isOpen ? "Cierra" : "Cerró"} el ${dl.date}, ${dl.time} hs` : "Sin fecha de cierre";

  let n = 0;
  const numbered = sections.map((s) => ({ s, n: s.compact ? undefined : ++n }));
  const compact = numbered.filter((x) => x.s.compact);
  const full = numbered.filter((x) => !x.s.compact);

  const year = item.deadline ? new Date(item.deadline).getFullYear() : null;

  const cta = (cls: string) => (
    <a href={applyHref} className={cls}>
      <span>Aplicar al casting</span>
      <Arrow />
    </a>
  );

  return (
    <div>
      {/* Portada: título tipo cartel + onda viva a sangre */}
      <header className="cs-hero">
        <div className="cs-container cs-hero-in">
          <div className="cs-hero-meta">
            <StatusDot open={isOpen} label={isOpen ? "Casting Abierto" : "Casting Cerrado"} />
            <span aria-hidden="true" className="cs-mono cs-hero-reg">SIVAR MUSIC — CASTING{year ? ` — ${year}` : ""}</span>
          </div>
          <p className="cs-mono mt-8 text-[13px] text-cs-ink-2">Proyecto</p>
          <PosterTitle text={title} muted={!isOpen} className="mt-3" />
        </div>
        <Waveform seed={title} flat={!isOpen} size="hero" className={`cs-hero-wave ${isOpen ? "text-cs-ink" : "text-cs-ink-2"}`} />
      </header>

      {/* Franja de color: timecode + CTA (azul abierto / tinta cerrado) */}
      <section ref={heroRef} className={`cs-slab cs-on-blue ${isOpen ? "cs-slab--blue" : "cs-slab--ink"}`}>
        <div className="cs-container cs-slab-in">
          <div className="min-w-0">
            {dl ? (
              <p className="cs-mono cs-slab-date">
                {isOpen ? "Cierra el" : "Cerró el"} {dl.date} · <span className="cs-nowrap">{dl.time}</span>
                {today ? <strong className="ml-2">Cierra hoy</strong> : null}
              </p>
            ) : null}
            {dl ? <Timecode countdown={countdown} closed={!isOpen} size="lg" label={timerLabel} /> : null}
            {!isOpen ? <p aria-hidden="true" className="cs-mono cs-slab-end">SESIÓN CERRADA — FIN DE TOMA</p> : null}
          </div>
          {isOpen ? cta("cs-btn-paper cs-btn-paper--lg") : null}
        </div>
      </section>

      {/* Contenido */}
      <div className="cs-container cs-body">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
            {item.brief ? (
              <Reveal>
                <h2 className="sr-only">Descripción del proyecto</h2>
                <p className="cs-brief whitespace-pre-wrap">{item.brief}</p>
              </Reveal>
            ) : null}
          </div>

          <div className="lg:col-span-7 space-y-16">
            {full.map(({ s, n: num }) => (
              <Section key={s.key} n={num} title={s.title}>{s.node}</Section>
            ))}

            {compact.map(({ s }) => (
              <p key={s.key} className="cs-mono border-t border-cs-rule pt-4 text-[13px] text-cs-ink-2">{s.node}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Cierre: tinta con CTA (abierto) o azul oscuro "terminado" (cerrado) */}
      {isOpen ? (
        <div className="cs-slab cs-slab--ink cs-on-blue cs-finale">
          <div className="cs-container">
            <Reveal className="cs-finale-in">
              <span aria-hidden="true" className="cs-finale-rule" />
              {cta("cs-btn-paper cs-btn-paper--lg")}
            </Reveal>
          </div>
        </div>
      ) : (
        <div className="cs-slab cs-slab--deep cs-on-blue cs-finale">
          <div className="cs-container">
            <p className="cs-display cs-finale-title">Casting terminado</p>
            <span aria-disabled="true" className="cs-btn-secondary cs-btn-secondary--inv mt-6">Casting cerrado</span>
            {closedNext ? (
              <div className="cs-next">
                <p className="cs-mono text-[13px]">{closedNext.title}</p>
                <p className="text-[16px]">{closedNext.text}</p>
                <div className="cs-next-actions">
                  <a href={closedNext.primary.href} className="cs-btn-paper">
                    <span>{closedNext.primary.label}</span>
                    <Arrow />
                  </a>
                  <a href={closedNext.secondary.href} className="cs-btn-secondary cs-btn-secondary--inv">{closedNext.secondary.label}</a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Barra inferior (solo mobile, cuando la franja sale de pantalla) */}
      {isOpen && heroGone ? (
        <div className="cs-sticky">
          <div className="cs-sticky-info">
            <p className="cs-mono text-[11px]">Cierra en</p>
            {dl ? <Timecode countdown={countdown} size="xs" label={timerLabel} /> : null}
          </div>
          <a href={applyHref} className="cs-sticky-btn">Aplicar al casting</a>
        </div>
      ) : null}
    </div>
  );
}
