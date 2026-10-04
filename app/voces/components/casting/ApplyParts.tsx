"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ChangeEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Arrow from "./Arrow";
import StatusDot from "./StatusDot";
import PosterTitle from "./PosterTitle";
import Timecode from "./Timecode";
import Waveform from "./Waveform";
import { formatDeadline, useCountdown } from "./useCountdown";

const InfoIcon = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="shrink-0 mt-[2px]">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
  </svg>
);

/* ---------- Layout del formulario (aside + contenido) ---------- */
export function ApplyShell({
  projectName,
  deadline,
  backHref,
  index,
  children,
}: {
  projectName?: string;
  deadline?: string | null;
  backHref: string;
  index: Array<{ id: string; label: string }>;
  children: ReactNode;
}) {
  const countdown = useCountdown(deadline);
  const isOpen = !deadline || new Date() < new Date(deadline);
  const dl = deadline ? formatDeadline(deadline) : null;
  const timerLabel = dl ? `${isOpen ? "Cierra" : "Cerró"} el ${dl.date}, ${dl.time} hs` : "";

  // Solo presentación: sección activa (IntersectionObserver) y nivel de llenado por sección
  // leído del DOM (no toca el estado del formulario ni su envío).
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const progRef = useRef<HTMLSpanElement | null>(null);
  const [active, setActive] = useState<string>(index[0]?.id ?? "");
  const [fill, setFill] = useState<Record<string, number>>({});

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = index.map((it) => document.getElementById(it.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-25% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const last = index[index.length - 1]?.id;
    if (!last) return;
    const onScroll = () => {
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8) setActive(last);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    const compute = () => {
      const next: Record<string, number> = {};
      for (const it of index) {
        const sec = document.getElementById(it.id);
        if (!sec) continue;
        const inputs = Array.from(sec.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".cs-input"));
        const hasFile = !!sec.querySelector(".truncate");
        if (it.id === "audio") next[it.id] = hasFile || inputs.some((i) => i.value.trim()) ? 1 : 0;
        else if (!inputs.length) next[it.id] = 1; // opciones con valor por defecto
        else next[it.id] = inputs.filter((i) => i.value.trim()).length / inputs.length;
      }
      setFill((prev) => {
        const same = Object.keys(next).length === Object.keys(prev).length && Object.keys(next).every((k) => prev[k] === next[k]);
        return same ? prev : next;
      });
    };
    compute();
    root.addEventListener("input", compute);
    root.addEventListener("change", compute);
    const mo = new MutationObserver(compute);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      root.removeEventListener("input", compute);
      root.removeEventListener("change", compute);
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Barra fina de progreso de lectura (mobile): transform scaleX según el scroll del formulario.
  useEffect(() => {
    const root = bodyRef.current;
    const bar = progRef.current;
    if (!root || !bar) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = root.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      bar.style.transform = `scaleX(${p.toFixed(3)})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div aria-hidden="true" className="cs-progress">
        <span ref={progRef} />
      </div>
      <div className="cs-container py-10 md:py-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <aside className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
            <a href={backHref} className="cs-mono cs-backlink">← Volver</a>
            {projectName !== undefined ? (
              <p className="cs-mono mt-4 text-[13px] text-cs-ink-2">
                Proyecto <span className="text-cs-ink">{projectName || "Sin título"}</span>
              </p>
            ) : null}
            <h1 className="cs-display cs-apply-h1 mt-6 text-cs-ink">Aplicar al casting</h1>
            {dl ? (
              <div className="cs-console mt-6">
                <p className="cs-mono text-[13px] text-cs-ink-2 mb-3">Cierra en</p>
                <Timecode countdown={countdown} closed={!isOpen} size="sm" label={timerLabel} />
              </div>
            ) : null}
            <nav aria-label="Secciones del formulario" className="mt-10 hidden lg:block border-t border-cs-ink">
              {index.map((it, i) => (
                <a
                  key={it.id}
                  href={`#${it.id}`}
                  className={`cs-index${active === it.id ? " is-active" : ""}`}
                  aria-current={active === it.id ? "location" : undefined}
                >
                  <span aria-hidden="true" className="cs-index-play">▶</span>
                  <span className="cs-mono text-[13px]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[16px] font-[500]">{it.label}</span>
                  <span aria-hidden="true" className="cs-index-meter">
                    <span style={{ transform: `scaleX(${fill[it.id] ?? 0})` }} />
                  </span>
                </a>
              ))}
            </nav>
          </aside>
          <div ref={bodyRef} className="lg:col-span-8">{children}</div>
        </div>
      </div>
    </>
  );
}

/* ---------- Banners ---------- */
// Errores de validación del formulario (faltan datos) vs. fallas del servidor/red.
const VALIDATION_RE = /^(Completá|Indicá|Debés|El archivo es demasiado)/;

export function ErrorBanner({ id, message }: { id: string; message: string | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const host = useSyncExternalStore(
    () => () => {},
    () => document.querySelector('[data-theme="casting"]'),
    () => null,
  );
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (!message && dismissed) setDismissed(null);
  const isValidation = !!message && VALIDATION_RE.test(message);
  useEffect(() => {
    if (!message) return;
    ref.current?.focus({ preventScroll: true });
    if (!isValidation) return;
    // Lleva al usuario al primer campo con error y lo "sacude" (si el movimiento está permitido).
    const bad = document.querySelector<HTMLElement>('.cs-input[aria-invalid="true"], .cs-drop--invalid');
    if (!bad) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = bad.closest<HTMLElement>(".cs-field") ?? bad;
    target.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
    if (!calm) {
      target.classList.remove("cs-shake");
      void target.offsetWidth;
      target.classList.add("cs-shake");
      const off = () => target.classList.remove("cs-shake");
      target.addEventListener("animationend", off, { once: true });
    }
  }, [message, isValidation]);
  // Fallas de servidor: se cierran solas a los 8 s, salvo que el foco esté dentro.
  useEffect(() => {
    if (!message || isValidation) return;
    const t = setTimeout(() => {
      if (!ref.current?.contains(document.activeElement) || document.activeElement === ref.current) setDismissed(message);
    }, 8000);
    return () => clearTimeout(t);
  }, [message, isValidation]);
  if (!message || dismissed === message) return null;

  if (isValidation) {
    // Validación: banner en flujo (no tapa el campo que se corrige).
    return (
      <div ref={ref} id={id} tabIndex={-1} role="alert" className="cs-banner cs-banner--error">
        <p className="font-[600] text-cs-danger">Falta completar</p>
        <p className="text-[15px] text-cs-ink">{message}</p>
      </div>
    );
  }
  if (!host) return null;
  // Servidor/red: toast fijo (portal dentro del tema) para no empujar el layout.
  return createPortal(
    <div ref={ref} id={id} tabIndex={-1} role="alert" className="cs-banner cs-banner--error cs-toast">
      <div className="min-w-0">
        <p className="font-[600] text-cs-danger">No pudimos enviar tu postulación</p>
        <p className="text-[15px] text-cs-ink">{message}</p>
      </div>
      <button type="button" className="cs-toast-close cs-mono" onClick={() => setDismissed(message)}>
        Cerrar
      </button>
    </div>,
    host,
  );
}

export function AdminBanner({ children }: { children: ReactNode }) {
  return (
    <div className="cs-admin">
      <span className="cs-mono cs-admin-tag">ADMIN</span>
      <span>{children}</span>
    </div>
  );
}

export function DupNotice({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="cs-dup">
      <InfoIcon />
      <span>{children}</span>
    </p>
  );
}

/* ---------- Campos ---------- */
export function Field({
  label,
  required,
  invalid,
  describedBy,
  errorText,
  children,
}: {
  label: string;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** Mensaje visible bajo el campo cuando `invalid` (solo presentación). */
  errorText?: string | null;
  children: (p: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string; className: string }) => ReactNode;
}) {
  const id = useId();
  const errId = `${id}-err`;
  const showErr = !!invalid && !!errorText;
  return (
    <div className="cs-field">
      <label htmlFor={id} className="cs-label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <div className="cs-ctl">
        {children({
          id,
          "aria-invalid": invalid || undefined,
          "aria-describedby": [describedBy, showErr ? errId : null].filter(Boolean).join(" ") || undefined,
          className: "cs-input",
        })}
        <span aria-hidden="true" className="cs-bar" />
      </div>
      {showErr ? (
        <p id={errId} className="cs-field-err cs-mono">
          <span aria-hidden="true">▲ ERR — </span>
          {errorText}
        </p>
      ) : null}
    </div>
  );
}

export function SelectWrap({ children }: { children: ReactNode }) {
  return (
    <div className="cs-select">
      {children}
      <span aria-hidden="true" className="cs-select-chev cs-mono">↓</span>
    </div>
  );
}

export function Segmented({
  legend,
  name,
  value,
  onChange,
  options,
}: {
  legend: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <fieldset className="cs-fieldset">
      <legend className="cs-label">{legend}</legend>
      <div className="cs-seg">
        {options.map((o) => (
          <label key={o.value} className="cs-seg-cell">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ---------- Audio: subir archivo / pegar link ---------- */
export function AudioField({
  inputId,
  audioFile,
  audioLink,
  invalid,
  describedBy,
  errorText,
  hint,
  linkLabel,
  onFileChange,
  onLinkChange,
  onRemoveFile,
}: {
  inputId: string;
  audioFile: File | null;
  audioLink: string;
  invalid?: boolean;
  describedBy?: string;
  errorText?: string | null;
  hint: string;
  linkLabel: string;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onLinkChange: (v: string) => void;
  onRemoveFile: () => void;
}) {
  const [mode, setMode] = useState<"file" | "link">("file");
  const tabFile = useId();
  const tabLink = useId();
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = mode === "file" ? "link" : "file";
      setMode(next);
      document.getElementById(next === "file" ? tabFile : tabLink)?.focus();
    }
  };
  return (
    <div className="cs-field">
      <div className="cs-label-row">
        <span className="cs-label !mb-0">Audio <span aria-hidden="true">*</span></span>
        <span className="text-[13px] text-cs-ink-2">(requerido)</span>
      </div>
      <div role="tablist" aria-label="Cómo enviar el audio" className="cs-tabs" onKeyDown={onKey}>
        <button id={tabFile} type="button" role="tab" aria-selected={mode === "file"} aria-controls={`${tabFile}-p`} tabIndex={mode === "file" ? 0 : -1} className="cs-tab" onClick={() => setMode("file")}>
          Subir archivo
        </button>
        <button id={tabLink} type="button" role="tab" aria-selected={mode === "link"} aria-controls={`${tabLink}-p`} tabIndex={mode === "link" ? 0 : -1} className="cs-tab" onClick={() => setMode("link")}>
          Pegar link
        </button>
      </div>

      {/* Input real, oculto pero accesible; lo dispara el botón. */}
      <input id={inputId} type="file" accept="audio/*" onChange={onFileChange} className="sr-only" tabIndex={-1} aria-hidden="true" />

      <div id={`${tabFile}-p`} role="tabpanel" aria-labelledby={tabFile} hidden={mode !== "file"} className={`cs-drop${invalid ? " cs-drop--invalid" : ""}`}>
        {audioFile ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-[16px] font-[500]">{audioFile.name}</p>
              <p className="cs-mono text-[12px] text-cs-ink-2">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button type="button" className="cs-btn-secondary" onClick={onRemoveFile}>Quitar</button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" className="cs-btn-secondary" aria-describedby={describedBy} onClick={() => document.getElementById(inputId)?.click()}>
              Seleccionar archivo
            </button>
            <span className="text-[14px] text-cs-ink-2">Ningún archivo</span>
          </div>
        )}
        <p className="cs-mono mt-3 text-[12px] text-cs-ink-2">{hint}</p>
      </div>

      <div id={`${tabLink}-p`} role="tabpanel" aria-labelledby={tabLink} hidden={mode !== "link"} className="pt-2">
        <label htmlFor={`${inputId}-link`} className="cs-label">{linkLabel}</label>
        <input
          id={`${inputId}-link`}
          type="url"
          value={audioLink}
          onChange={(e) => onLinkChange(e.target.value)}
          placeholder="https://drive.google.com/…"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="cs-input"
        />
      </div>
      {invalid && errorText ? (
        <p className="cs-field-err cs-mono">
          <span aria-hidden="true">▲ ERR — </span>
          {errorText}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- Envío ---------- */
export function SubmitButton({ submitting }: { submitting: boolean }) {
  return (
    <div className="cs-btn-wrap lg:max-w-[380px]">
      <button type="submit" disabled={submitting} aria-busy={submitting} className="cs-btn">
        <span>{submitting ? "Enviando…" : "Enviar postulación"}</span>
        <Arrow />
      </button>
      {submitting ? <span aria-hidden="true" className="cs-loadbar" /> : null}
    </div>
  );
}

/* ---------- Casting cerrado (formulario) ---------- */
export function ClosedPanel({
  title,
  deadline,
  backHref,
  children,
}: {
  title: string;
  deadline?: string | null;
  backHref: string;
  children: ReactNode;
}) {
  const dl = deadline ? formatDeadline(deadline) : null;
  const long = deadline
    ? new Date(deadline).toLocaleString("es-AR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";
  return (
    <div>
      <div className="cs-container pt-10 md:pt-16">
        <div className="space-y-6">
          <StatusDot open={false} label="Casting Cerrado" />
          <PosterTitle text={title} muted />
        </div>
      </div>
      <Waveform flat size="hero" className="mt-8 text-cs-ink-2" />
      <div className="cs-container py-8 md:py-12">
        <div className="space-y-6">
          {dl ? <p className="cs-mono text-[13px] text-cs-ink-2">Cerró el {long} hs</p> : null}
          <Timecode countdown={null} closed size="md" label={dl ? `Cerró el ${dl.date}, ${dl.time} hs` : "Casting cerrado"} />
          <p aria-hidden="true" className="cs-mono text-[13px] text-cs-ink-2">SESIÓN CERRADA — FIN DE TOMA</p>
        </div>
      </div>
      <div className="cs-slab cs-slab--deep cs-on-blue cs-band--bleed">
        <div className="cs-container">
          <p className="cs-display cs-finale-title">Casting terminado</p>
          <div className="mt-6 max-w-2xl space-y-3 text-[16px]">{children}</div>
          <a href={backHref} className="cs-btn-secondary cs-btn-secondary--inv mt-8">Volver al casting</a>
        </div>
      </div>
    </div>
  );
}
