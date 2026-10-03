"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Arrow from "./Arrow";
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

function titleSize(t: string) {
  const n = t.length;
  if (n <= 10) return "text-[96px] md:text-[136px]";
  if (n <= 20) return "text-[64px] md:text-[96px]";
  return "text-[44px] md:text-[64px]";
}

export function CastingSkeleton() {
  return (
    <div className="cs-container py-10 md:py-16" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-6">
          <div className="cs-skel h-4 w-32" />
          <div className="cs-skel h-24 w-full md:h-32" />
          <div className="cs-skel h-12 w-full" />
          <div className="cs-skel h-5 w-64 max-w-full" />
          <div className="cs-skel h-16 w-full" />
        </div>
        <div className="lg:col-span-7 space-y-6">
          <div className="cs-skel h-24 w-full" />
          <div className="cs-skel h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

export function CastingErrorState({ message }: { message: string }) {
  return (
    <div className="cs-container py-10 md:py-16">
      <Waveform error className="cs-wave h-12 w-full max-w-[420px] text-cs-danger" />
      <p className="cs-mono mt-6 text-[13px] text-cs-danger">Error</p>
      <h1 className="cs-display mt-3 text-[56px] text-cs-ink">No disponible</h1>
      <p role="alert" className="mt-6 max-w-xl text-[16px] text-cs-ink-2">{message}</p>
      <button type="button" className="cs-btn-secondary mt-8" onClick={() => window.location.reload()}>
        Reintentar
      </button>
    </div>
  );
}

export default function CastingDetailView({
  item,
  applyHref,
  sections,
}: {
  item: { title?: string; brief?: string; deadline?: string | null };
  applyHref: string;
  sections: DetailSection[];
}) {
  const isOpen = !item?.deadline || new Date() < new Date(item.deadline);
  const countdown = useCountdown(item?.deadline);
  const title: string = item.title || "Sin título";
  const heroRef = useRef<HTMLDivElement | null>(null);
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

  return (
    <div className="cs-container py-10 md:py-16 pb-24 lg:pb-16">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Hero */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
          <div ref={heroRef} className="space-y-6">
            <StatusDot open={isOpen} label={isOpen ? "Casting Abierto" : "Casting Cerrado"} />
            <div>
              <p className="cs-mono text-[13px] text-cs-ink-2">Proyecto</p>
              <h1 className={`cs-display mt-2 ${titleSize(title)} ${isOpen ? "text-cs-ink" : "text-cs-ink-2"}`}>{title}</h1>
            </div>
            <Waveform seed={title} flat={!isOpen} className="h-12 w-full text-cs-ink" />
            {dl ? (
              <p className="cs-mono text-[13px] text-cs-ink-2">
                {isOpen ? "Cierra el" : "Cerró el"} {dl.date} · {dl.time} hs
                {today ? <strong className="ml-2 text-cs-ink">Cierra hoy</strong> : null}
              </p>
            ) : null}
            {dl ? <Timecode countdown={countdown} closed={!isOpen} size="md" label={timerLabel} /> : null}
            {isOpen ? (
              <a href={applyHref} className="cs-btn hidden lg:flex">
                <span>Aplicar al casting</span>
                <Arrow />
              </a>
            ) : null}
          </div>
        </div>

        {/* Contenido */}
        <div className="lg:col-span-7 space-y-12">
          {item.brief ? (
            <div>
              <h2 className="sr-only">Descripción del proyecto</h2>
              <p className="whitespace-pre-wrap text-[16px] leading-[1.55] text-cs-ink-2 lg:text-[19px]">{item.brief}</p>
            </div>
          ) : null}

          {full.map(({ s, n: num }) => (
            <Section key={s.key} n={num} title={s.title}>{s.node}</Section>
          ))}

          {compact.map(({ s }) => (
            <p key={s.key} className="cs-mono border-t border-cs-rule pt-4 text-[13px] text-cs-ink-2">{s.node}</p>
          ))}

          {isOpen ? (
            <a href={applyHref} className="cs-btn lg:hidden">
              <span>Aplicar al casting</span>
              <Arrow />
            </a>
          ) : (
            <div className="cs-band">
              <p className="cs-display text-[44px] md:text-[64px]">Casting terminado</p>
              <span aria-disabled="true" className="cs-btn-secondary cs-btn-secondary--inv mt-6 opacity-60">Casting cerrado</span>
            </div>
          )}
        </div>
      </div>

      {/* Barra inferior (solo mobile, cuando el hero sale de pantalla) */}
      {isOpen && heroGone ? (
        <div className="cs-sticky lg:hidden">
          <div className="min-w-0">
            <p className="cs-mono text-[11px] text-cs-rule">Cierra en</p>
            {dl ? <Timecode countdown={countdown} size="xs" label={timerLabel} /> : null}
          </div>
          <a href={applyHref} className="cs-sticky-btn">Aplicar al casting</a>
        </div>
      ) : null}
    </div>
  );
}
