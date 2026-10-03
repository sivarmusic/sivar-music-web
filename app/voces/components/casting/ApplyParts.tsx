"use client";
import { useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import Arrow from "./Arrow";
import StatusDot from "./StatusDot";
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
  return (
    <div className="cs-container py-10 md:py-16">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <aside className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
          <a href={backHref} className="cs-mono cs-backlink">← Volver</a>
          {projectName !== undefined ? (
            <p className="cs-mono mt-4 text-[13px] text-cs-ink-2">
              Proyecto <span className="text-cs-ink">{projectName || "Sin título"}</span>
            </p>
          ) : null}
          <h1 className="cs-display mt-6 text-[60px] lg:text-[88px] text-cs-ink">Aplicar al casting</h1>
          {dl ? (
            <div className="mt-6">
              <p className="cs-mono text-[13px] text-cs-ink-2 mb-2">Cierra en</p>
              <Timecode countdown={countdown} closed={!isOpen} size="sm" label={timerLabel} />
            </div>
          ) : null}
          <nav aria-label="Secciones del formulario" className="mt-10 hidden lg:block border-t border-cs-ink">
            {index.map((it, i) => (
              <a key={it.id} href={`#${it.id}`} className="cs-index">
                <span className="cs-mono text-[13px] text-cs-ink-2">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[16px] font-[500]">{it.label}</span>
              </a>
            ))}
          </nav>
        </aside>
        <div className="lg:col-span-8">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Banners ---------- */
export function ErrorBanner({ id, message }: { id: string; message: string | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message]);
  if (!message) return null;
  return (
    <div ref={ref} id={id} tabIndex={-1} role="alert" className="cs-banner cs-banner--error">
      <p className="font-[600] text-cs-danger">No pudimos enviar tu postulación</p>
      <p className="text-[15px] text-cs-ink">{message}</p>
    </div>
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
  children,
}: {
  label: string;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  children: (p: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string; className: string }) => ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="cs-label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children({
        id,
        "aria-invalid": invalid || undefined,
        "aria-describedby": describedBy,
        className: "cs-input",
      })}
    </div>
  );
}

export function SelectWrap({ children }: { children: ReactNode }) {
  return (
    <div className="cs-select">
      {children}
      <svg aria-hidden="true" className="cs-select-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="square" d="m5 9 7 7 7-7" />
      </svg>
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
    <div>
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
    <div className="cs-container py-10 md:py-16">
      <div className="space-y-6 max-w-3xl">
        <StatusDot open={false} label="Casting Cerrado" />
        <h1 className="cs-display text-[44px] md:text-[64px] text-cs-ink-2">{title}</h1>
        <Waveform flat className="h-12 w-full text-cs-ink-2" />
        {dl ? <p className="cs-mono text-[13px] text-cs-ink-2">Cerró el {long} hs</p> : null}
        <Timecode countdown={null} closed size="md" label={dl ? `Cerró el ${dl.date}, ${dl.time} hs` : "Casting cerrado"} />
      </div>
      <div className="cs-band mt-12">
        <p className="cs-display text-[44px] md:text-[64px]">Casting terminado</p>
        <div className="mt-6 max-w-2xl space-y-3 text-[16px] text-cs-rule">{children}</div>
        <a href={backHref} className="cs-btn-secondary cs-btn-secondary--inv mt-8">Volver al casting</a>
      </div>
    </div>
  );
}
