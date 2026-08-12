"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const VOICE_AGES = ["Child (5-12)", "Teen (13-17)", "Young Adult (18-35)", "Middle Aged (35-54)", "Senior (55+)"];

const LANGUAGES = [
  "Spanish - Argentina", "Spanish - Neutral", "Spanish - Central America",
  "Spanish - Colombia", "Spanish - Venezuela", "Spanish - Chile",
  "Spanish - Mexico", "Spanish - Caribbean",
  "English - American", "English - British", "English - Latin/Hispanic", "English - Caribbean",
  "Portuguese - Brasil", "Portuguese - Portugal",
];

const STYLES = [
  "Commercial/Advertising", "Narration", "Casual/Conversational",
  "Dubbing", "Character voices",
];

const COUNTRIES = [
  "Argentina", "Bolivia", "Brasil", "Canada", "Chile", "Colombia", "Costa Rica",
  "Cuba", "Ecuador", "El Salvador", "España", "Estados Unidos", "Guatemala",
  "Honduras", "Jamaica", "México", "Nicaragua", "Panamá", "Paraguay", "Perú",
  "Puerto Rico", "República Dominicana", "Uruguay", "Venezuela",
  "Alemania", "Australia", "Francia", "India", "Italia", "Nueva Zelanda",
  "Portugal", "Reino Unido", "Sudáfrica", "Otro",
];

const STEPS = ["Datos básicos", "Audios", "Perfil", "Voz", "¿Cantante?"];
const MAX_FILE_MB = 10;
const DRAFT_KEY = "voces_registro_draft_v1";

// ── Helpers ───────────────────────────────────────────────────────────────────

type UploadProgress = (pct: number) => void;

async function uploadFile(file: File, kind: string, onProgress?: UploadProgress): Promise<string> {
  const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "mp3";
  const res = await fetch(`/api/voces/registro/upload-url?ext=${ext}&kind=${kind}`);
  const data = await res.json();
  if (!data?.ok || !data.signedUrl) throw new Error("No se pudo iniciar la subida del audio.");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", data.signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "audio/mpeg");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve();
      } else reject(new Error("Error subiendo el archivo. Intentá de nuevo."));
    };
    xhr.onerror = () => reject(new Error("Error de red al subir el archivo."));
    xhr.send(file);
  });

  return data.publicUrl;
}

function validateFile(file: File | null): string | null {
  if (!file) return null;
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `El archivo supera los ${MAX_FILE_MB} MB.`;
  if (!file.type.startsWith("audio/")) return "Solo se aceptan archivos de audio.";
  return null;
}

// ── Static sub-components (defined OUTSIDE the page to avoid remount on render) ──

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>
      {children}{required && <span style={{ color: "var(--color-accent)" }}> *</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-[12px]" style={{ color: "var(--color-accent)" }}>{msg}</p>;
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] p-6 sm:p-8 flex flex-col gap-5"
      style={{ background: "var(--color-bg-card)", border: "0.5px solid var(--color-border-default)" }}>
      <div>
        <h2 className="text-[18px] tracking-[-0.01em]"
          style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
          {title}
        </h2>
        {subtitle && <p className="text-[13px] mt-1" style={{ color: "var(--color-text-muted)" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function RadioGroup({ name, options, value, onChange }: {
  name: string; options: { label: string; value: string }[];
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] transition-all"
          style={value === o.value
            ? { background: "var(--color-accent)", color: "#fff", border: "0.5px solid var(--color-accent)" }
            : { background: "var(--color-bg-subtle)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-default)" }
          }>
          <span className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
            style={{ borderColor: value === o.value ? "#fff" : "var(--color-text-muted)" }}>
            {value === o.value && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </span>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CheckboxGroup({ options, selected, onChange, otherLabel, otherValue, onOtherChange }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void;
  otherLabel?: string; otherValue?: string; onOtherChange?: (v: string) => void;
}) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt]);
  }
  const otherChecked = selected.includes("__other__");
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-all"
            style={active
              ? { background: "rgba(232,76,43,0.15)", color: "var(--color-accent)", border: "0.5px solid rgba(232,76,43,0.4)" }
              : { background: "var(--color-bg-subtle)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-default)" }
            }>
            <span className="w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0"
              style={{ borderColor: active ? "var(--color-accent)" : "var(--color-text-muted)", background: active ? "var(--color-accent)" : "transparent" }}>
              {active && (
                <svg viewBox="0 0 10 10" fill="none" className="w-2 h-2">
                  <path d="M1.5 5l2.5 2.5 4.5-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {opt}
          </button>
        );
      })}
      {otherLabel !== undefined && (
        <div className="w-full flex items-center gap-2 mt-1">
          <button type="button" onClick={() => toggle("__other__")}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-all flex-shrink-0"
            style={otherChecked
              ? { background: "rgba(232,76,43,0.15)", color: "var(--color-accent)", border: "0.5px solid rgba(232,76,43,0.4)" }
              : { background: "var(--color-bg-subtle)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-default)" }
            }>
            <span className="w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0"
              style={{ borderColor: otherChecked ? "var(--color-accent)" : "var(--color-text-muted)", background: otherChecked ? "var(--color-accent)" : "transparent" }}>
              {otherChecked && (
                <svg viewBox="0 0 10 10" fill="none" className="w-2 h-2">
                  <path d="M1.5 5l2.5 2.5 4.5-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {otherLabel}
          </button>
          {otherChecked && onOtherChange && (
            <input type="text" value={otherValue || ""} onChange={(e) => onOtherChange(e.target.value)}
              placeholder="Especificá..." className="ds-input flex-1 text-[12px] py-1.5"
              onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  );
}

function FileDropZone({ id, file, onChange, label, required, progress }: {
  id: string; file: File | null; onChange: (f: File | null) => void;
  label: string; required?: boolean; progress?: number | null;
}) {
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFiles(files: FileList | null) {
    const f = files?.[0] || null;
    if (f) { const err = validateFile(f); if (err) { alert(err); return; } }
    onChange(f);
  }

  const showProgress = typeof progress === "number" && progress >= 0 && progress < 100;

  if (file) {
    return (
      <div
        className="rounded-[12px] p-4"
        style={{ border: "1.5px solid var(--color-border-default)", background: "var(--color-bg-subtle)" }}
      >
        <div className="flex items-start gap-3 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 opacity-60 flex-shrink-0 mt-0.5" style={{ color: "var(--color-accent)" }}>
            <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-[500] truncate" style={{ color: "var(--color-text-primary)" }}>{file.name}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          <button
            type="button"
            onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ""; }}
            className="text-[11px] underline flex-shrink-0"
            style={{ color: "var(--color-text-muted)" }}
            disabled={showProgress}
          >
            Quitar
          </button>
        </div>
        {previewUrl && (
          <audio src={previewUrl} controls className="w-full h-9" style={{ colorScheme: "dark" }} />
        )}
        {showProgress && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] mb-1" style={{ color: "var(--color-text-muted)" }}>
              <span>Subiendo…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full transition-all" style={{ width: `${progress}%`, background: "var(--color-accent)" }} />
            </div>
          </div>
        )}
        <input ref={inputRef} id={id} type="file" accept="audio/*" className="hidden"
          onChange={(e) => handleFiles(e.target.files)} />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className="rounded-[12px] p-5 text-center cursor-pointer transition-all"
      style={{ border: `1.5px dashed ${dragging ? "var(--color-accent)" : "var(--color-border-default)"}`, background: dragging ? "rgba(232,76,43,0.06)" : "var(--color-bg-subtle)" }}
    >
      <input ref={inputRef} id={id} type="file" accept="audio/*" className="hidden"
        onChange={(e) => handleFiles(e.target.files)} onClick={(e) => e.stopPropagation()} />
      <div className="flex flex-col items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 opacity-40" style={{ color: "var(--color-text-primary)" }}>
          <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            {label}{required && <span style={{ color: "var(--color-accent)" }}> *</span>}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Arrastrá un archivo o hacé clic · mp3, wav, ogg · máx {MAX_FILE_MB} MB
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RegistroPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [demo2File, setDemo2File] = useState<File | null>(null);

  // Step 3
  const [gender, setGender] = useState("");
  const [homeStudio, setHomeStudio] = useState("");
  const [onlineSessions, setOnlineSessions] = useState("");
  const [equipment, setEquipment] = useState("");
  const [socialMedia, setSocialMedia] = useState("");

  // Step 4
  const [age, setAge] = useState("");
  const [voiceAges, setVoiceAges] = useState<string[]>([]);
  const [country, setCountry] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [languageOther, setLanguageOther] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [styleOther, setStyleOther] = useState("");

  // Step 5
  const [isSinger, setIsSinger] = useState("");
  const [singerDemoFile, setSingerDemoFile] = useState<File | null>(null);

  // Upload progress
  const [demoProgress, setDemoProgress] = useState<number | null>(null);
  const [demo2Progress, setDemo2Progress] = useState<number | null>(null);
  const [singerProgress, setSingerProgress] = useState<number | null>(null);

  // ── Restore draft on mount ───────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.firstName) setFirstName(d.firstName);
        if (d.lastName) setLastName(d.lastName);
        if (d.email) setEmail(d.email);
        if (d.phone) setPhone(d.phone);
        if (d.gender) setGender(d.gender);
        if (d.homeStudio) setHomeStudio(d.homeStudio);
        if (d.onlineSessions) setOnlineSessions(d.onlineSessions);
        if (d.equipment) setEquipment(d.equipment);
        if (d.socialMedia) setSocialMedia(d.socialMedia);
        if (d.age) setAge(d.age);
        if (Array.isArray(d.voiceAges)) setVoiceAges(d.voiceAges);
        if (d.country) setCountry(d.country);
        if (Array.isArray(d.languages)) setLanguages(d.languages);
        if (d.languageOther) setLanguageOther(d.languageOther);
        if (Array.isArray(d.styles)) setStyles(d.styles);
        if (d.styleOther) setStyleOther(d.styleOther);
        if (d.isSinger) setIsSinger(d.isSinger);
        if (typeof d.step === "number" && d.step >= 0 && d.step < STEPS.length) setStep(d.step);
        const hadContent = !!(d.firstName || d.lastName || d.email || d.phone);
        if (hadContent) setDraftRestored(true);
      }
    } catch {}
    setDraftLoaded(true);
  }, []);

  // ── Persist draft on change ──────────────────────────────────────────────
  useEffect(() => {
    if (!draftLoaded) return;
    try {
      const payload = {
        step, firstName, lastName, email, phone,
        gender, homeStudio, onlineSessions, equipment, socialMedia,
        age, voiceAges, country, languages, languageOther, styles, styleOther,
        isSinger,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {}
  }, [draftLoaded, step, firstName, lastName, email, phone, gender, homeStudio, onlineSessions, equipment, socialMedia, age, voiceAges, country, languages, languageOther, styles, styleOther, isSinger]);

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }

  function discardDraft() {
    clearDraft();
    setStep(0);
    setFirstName(""); setLastName(""); setEmail(""); setPhone("");
    setGender(""); setHomeStudio(""); setOnlineSessions(""); setEquipment(""); setSocialMedia("");
    setAge(""); setVoiceAges([]); setCountry(""); setLanguages([]); setLanguageOther(""); setStyles([]); setStyleOther("");
    setIsSinger("");
    setDraftRestored(false);
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function validateStep(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!firstName.trim()) e.firstName = "El nombre es obligatorio.";
      if (!lastName.trim()) e.lastName = "El apellido es obligatorio.";
      if (!email.trim()) e.email = "El email es obligatorio.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Email inválido.";
      if (!phone.trim()) e.phone = "El teléfono es obligatorio.";
    }
    if (s === 1) {
      if (!demoFile) e.demoFile = "El demo principal es obligatorio.";
    }
    if (s === 2) {
      if (!gender) e.gender = "Seleccioná el género de voz.";
      if (!homeStudio) e.homeStudio = "Indicá si tenés home studio.";
      if (!onlineSessions) e.onlineSessions = "Indicá disponibilidad para sesiones online.";
      if (!equipment.trim()) e.equipment = "Describí tu equipo de estudio.";
      if (!socialMedia.trim()) e.socialMedia = "Ingresá un link de redes sociales.";
    }
    if (s === 3) {
      const ageNum = parseInt(age, 10);
      if (!age) e.age = "La edad es obligatoria.";
      else if (isNaN(ageNum) || ageNum < 5 || ageNum > 100) e.age = "La edad debe ser un número entre 5 y 100.";
      if (voiceAges.length === 0) e.voiceAges = "Seleccioná al menos una edad de voz.";
      if (!country) e.country = "Seleccioná tu país.";
      if (languages.length === 0) e.languages = "Seleccioná al menos un idioma/acento.";
      if (styles.length === 0) e.styles = "Seleccioná al menos un estilo de voz.";
    }
    if (s === 4) {
      if (!isSinger) e.isSinger = "Indicá si sos cantante.";
    }
    return e;
  }

  function next() {
    if (isAdmin) { setErrors({}); setStep((s) => s + 1); return; }
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => s + 1);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() { setErrors({}); setStep((s) => s - 1); }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!isAdmin) {
      const finalErrors = validateStep(4);
      setErrors(finalErrors);
      if (Object.keys(finalErrors).length > 0) return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setDemoProgress(demoFile ? 0 : null);
    setDemo2Progress(demo2File ? 0 : null);
    setSingerProgress(singerDemoFile && isSinger === "yes" ? 0 : null);

    try {
      const [demoUrl, demo2Url, singerDemoUrl] = await Promise.all([
        demoFile ? uploadFile(demoFile, "demo", setDemoProgress) : Promise.resolve(""),
        demo2File ? uploadFile(demo2File, "demo2", setDemo2Progress) : Promise.resolve(""),
        singerDemoFile && isSinger === "yes" ? uploadFile(singerDemoFile, "singer", setSingerProgress) : Promise.resolve(""),
      ]);

      const finalLanguages = [
        ...languages.filter((l) => l !== "__other__"),
        ...(languages.includes("__other__") && languageOther.trim() ? [languageOther.trim()] : []),
      ];
      const finalStyles = [
        ...styles.filter((s) => s !== "__other__"),
        ...(styles.includes("__other__") && styleOther.trim() ? [styleOther.trim()] : []),
      ];

      const res = await fetch("/api/voces/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName, email, phone,
          gender, homeStudio, onlineSessions, equipment, socialMedia,
          country, age, voiceAges, languages: finalLanguages, styles: finalStyles,
          isSinger, demoUrl, demo2Url, singerDemoUrl,
        }),
      });

      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Error enviando el formulario.");
      clearDraft();
      router.push("/voces/registro/gracias");
    } catch (err: any) {
      setSubmitError(err?.message || "Error. Intentá de nuevo.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "ds-input [color-scheme:dark]";

  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-10 pb-16 md:pb-10">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4"
            style={{ background: "var(--color-accent-bg)", border: "0.5px solid var(--color-accent-border)" }}>
            <span className="text-[11px] font-[600] tracking-widest uppercase" style={{ color: "var(--color-accent)" }}>Sivar Music</span>
          </span>
          <h1 className="text-[30px] sm:text-[36px] tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
            Registrate como locutor
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: "var(--color-text-muted)" }}>
            Completá el formulario para unirte al banco de voces de Sivar Music.
          </p>
        </div>

        {/* Draft restored banner */}
        {draftRestored && (
          <div className="mb-4 flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-[12px]"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
            <span>Recuperamos tu progreso anterior.</span>
            <button type="button" onClick={discardDraft} className="underline flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
              Empezar de cero
            </button>
          </div>
        )}

        {/* Admin badge */}
        {isAdmin && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
            style={{ background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.25)", color: "var(--color-accent)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
            Modo admin — podés navegar sin completar los campos obligatorios.
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center gap-1.5">
            {STEPS.map((label, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full h-1 rounded-full transition-all"
                  style={{ background: i <= step ? "var(--color-accent)" : "var(--color-border-default)" }} />
                <span className="hidden sm:block text-[10px] font-[600] uppercase tracking-wider transition-colors"
                  style={{ color: i === step ? "var(--color-accent)" : "var(--color-text-muted)" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <p className="sm:hidden text-center mt-2 text-[11px] font-[600] uppercase tracking-wider" style={{ color: "var(--color-accent)" }}>
            Paso {step + 1} de {STEPS.length} — {STEPS[step]}
          </p>
        </div>

        {submitError && (
          <div className="mb-4 px-4 py-3 rounded-[10px] text-[13px]"
            style={{ color: "var(--color-accent)", background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.20)" }}>
            {submitError}
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} noValidate>

          {/* Step 0 */}
          {step === 0 && (
            <SectionCard title="Información básica" subtitle="Tus datos de contacto.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Nombre</Label>
                  <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Tu nombre" />
                  <FieldError msg={errors.firstName} />
                </div>
                <div>
                  <Label required>Apellido</Label>
                  <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Tu apellido" />
                  <FieldError msg={errors.lastName} />
                </div>
              </div>
              <div>
                <Label required>Email</Label>
                <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
                <FieldError msg={errors.email} />
              </div>
              <div>
                <Label required>Teléfono / WhatsApp (con código de país)</Label>
                <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 9 11 0000-0000" />
                <FieldError msg={errors.phone} />
              </div>
            </SectionCard>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <SectionCard title="Archivos de audio" subtitle="Subí tu demo principal y, si querés, uno adicional.">
              <div>
                <Label required>Demo principal</Label>
                <FileDropZone id="demo" file={demoFile} onChange={setDemoFile} label="Arrastrá o seleccioná tu demo" required progress={demoProgress} />
                <FieldError msg={errors.demoFile} />
              </div>
              <div>
                <Label>Demo adicional <span style={{ color: "var(--color-text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(opcional)</span></Label>
                <FileDropZone id="demo2" file={demo2File} onChange={setDemo2File} label="Arrastrá o seleccioná un demo adicional" progress={demo2Progress} />
              </div>
            </SectionCard>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <SectionCard title="Perfil" subtitle="Información sobre tu setup y presencia online.">
              <div>
                <Label required>Género de voz</Label>
                <RadioGroup name="gender"
                  options={[{ label: "Masculino", value: "male" }, { label: "Femenino", value: "female" }]}
                  value={gender} onChange={setGender} />
                <FieldError msg={errors.gender} />
              </div>
              <div>
                <Label required>¿Tenés home studio?</Label>
                <RadioGroup name="homeStudio"
                  options={[{ label: "Sí", value: "yes" }, { label: "No", value: "no" }]}
                  value={homeStudio} onChange={setHomeStudio} />
                <FieldError msg={errors.homeStudio} />
              </div>
              <div>
                <Label required>¿Disponible para sesiones online?</Label>
                <RadioGroup name="onlineSessions"
                  options={[{ label: "Sí", value: "yes" }, { label: "No", value: "no" }]}
                  value={onlineSessions} onChange={setOnlineSessions} />
                <FieldError msg={errors.onlineSessions} />
              </div>
              <div>
                <Label required>Descripción del equipo de estudio</Label>
                <textarea className={inputClass} value={equipment} onChange={(e) => setEquipment(e.target.value)}
                  placeholder="Micrófono, interfaz, cabina, software de grabación..." rows={3} />
                <FieldError msg={errors.equipment} />
              </div>
              <div>
                <Label required>Link a perfil en redes sociales</Label>
                <input type="url" className={inputClass} value={socialMedia} onChange={(e) => setSocialMedia(e.target.value)}
                  placeholder="https://www.instagram.com/..." />
                <FieldError msg={errors.socialMedia} />
              </div>
            </SectionCard>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <SectionCard title="Detalles de voz" subtitle="Contanos sobre tu perfil vocal.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Edad</Label>
                  <input type="number" min={5} max={100} className={inputClass} value={age}
                    onChange={(e) => setAge(e.target.value)} placeholder="Ej: 32" />
                  <FieldError msg={errors.age} />
                </div>
                <div>
                  <Label required>País de residencia</Label>
                  <select className={`${inputClass} [color-scheme:dark]`} value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option value="">Seleccioná un país</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <FieldError msg={errors.country} />
                </div>
              </div>
              <div>
                <Label required>Edad de voz</Label>
                <CheckboxGroup options={VOICE_AGES} selected={voiceAges} onChange={setVoiceAges} />
                <FieldError msg={errors.voiceAges} />
              </div>
              <div>
                <Label required>Idioma / Acento</Label>
                <CheckboxGroup options={LANGUAGES} selected={languages} onChange={setLanguages}
                  otherLabel="Otros" otherValue={languageOther} onOtherChange={setLanguageOther} />
                <FieldError msg={errors.languages} />
              </div>
              <div>
                <Label required>Estilo de voz</Label>
                <CheckboxGroup options={STYLES} selected={styles} onChange={setStyles}
                  otherLabel="Otros" otherValue={styleOther} onOtherChange={setStyleOther} />
                <FieldError msg={errors.styles} />
              </div>
            </SectionCard>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <SectionCard title="¿Sos cantante?" subtitle="Si cantás, podés subir un demo de canto también.">
              <div>
                <Label required>¿Sos cantante?</Label>
                <RadioGroup name="isSinger"
                  options={[{ label: "Sí", value: "yes" }, { label: "No", value: "no" }]}
                  value={isSinger} onChange={(v) => { setIsSinger(v); if (v === "no") setSingerDemoFile(null); }} />
                <FieldError msg={errors.isSinger} />
              </div>
              {isSinger === "yes" && (
                <div>
                  <Label>Demo de canto <span style={{ color: "var(--color-text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(opcional)</span></Label>
                  <FileDropZone id="singer" file={singerDemoFile} onChange={setSingerDemoFile} label="Arrastrá o seleccioná tu demo de canto" progress={singerProgress} />
                </div>
              )}
            </SectionCard>
          )}

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between gap-4">
            {step > 0
              ? <button type="button" onClick={back} className="ds-btn-secondary text-[13px] px-5 py-2.5">← Atrás</button>
              : <div />
            }
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={next} className="ds-btn-primary text-[13px] px-6 py-2.5">
                Siguiente →
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={submitting} className="ds-btn-primary text-[13px] px-6 py-2.5"
                style={submitting ? { opacity: 0.5, cursor: "not-allowed" } : {}}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Enviando…
                  </span>
                ) : "Enviar registro"}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
