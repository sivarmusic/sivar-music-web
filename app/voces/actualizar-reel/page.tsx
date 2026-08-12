"use client";
import { useRef, useState } from "react";

const MAX_FILE_MB = 10;

type Demo = { id: string; kind: string; url: string; label: string };
type Talent = { id: string; fullName: string; email: string };

async function uploadFile(file: File): Promise<{ url: string; filename: string }> {
  const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "mp3";
  const res = await fetch(`/api/voces/registro/upload-url?ext=${ext}&kind=reel-update`);
  const data = await res.json();
  if (!data?.ok || !data.signedUrl) throw new Error("No se pudo iniciar la subida del audio.");
  const upload = await fetch(data.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "audio/mpeg" },
    body: file,
  });
  if (!upload.ok) throw new Error("Error subiendo el archivo. Intentá de nuevo.");
  return { url: data.publicUrl, filename: file.name };
}

function validateFile(file: File | null): string | null {
  if (!file) return null;
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `El archivo supera los ${MAX_FILE_MB} MB.`;
  if (!file.type.startsWith("audio/")) return "Solo se aceptan archivos de audio.";
  return null;
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

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>
      {children}{required && <span style={{ color: "var(--color-accent)" }}> *</span>}
    </label>
  );
}

function FileDropZone({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    const f = files?.[0] || null;
    if (f) { const err = validateFile(f); if (err) { alert(err); return; } }
    onChange(f);
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
      <input ref={inputRef} type="file" accept="audio/*" className="hidden"
        onChange={(e) => handleFiles(e.target.files)} onClick={(e) => e.stopPropagation()} />
      <div className="flex flex-col items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 opacity-40" style={{ color: "var(--color-text-primary)" }}>
          <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
        </svg>
        {file ? (
          <div>
            <p className="text-[13px] font-[500]" style={{ color: "var(--color-text-primary)" }}>{file.name}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
        ) : (
          <div>
            <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>Arrastrá o seleccioná tu nuevo demo</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>mp3, wav, ogg · máx {MAX_FILE_MB} MB</p>
          </div>
        )}
        {file && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(null); if (inputRef.current) inputRef.current.value = ""; }}
            className="text-[11px] underline mt-1" style={{ color: "var(--color-text-muted)" }}>
            Quitar archivo
          </button>
        )}
      </div>
    </div>
  );
}

export default function ActualizarReelPage() {
  const [step, setStep] = useState<"email" | "info" | "done">("email");
  const [email, setEmail] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const [talent, setTalent] = useState<Talent | null>(null);
  const [demos, setDemos] = useState<Demo[]>([]);
  const [hasPending, setHasPending] = useState(false);

  const [mode, setMode] = useState<"replace" | "add" | "">("");
  const [targetMediaId, setTargetMediaId] = useState<string>("");
  const [newFile, setNewFile] = useState<File | null>(null);

  const [newPhone, setNewPhone] = useState("");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError(null);
    if (!email.trim()) { setLookupError("Ingresá tu email."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setLookupError("Email inválido."); return; }

    setLookingUp(true);
    try {
      const res = await fetch(`/api/voces/actualizar-reel?email=${encodeURIComponent(email.toLowerCase().trim())}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setLookupError(data?.error || "No pudimos buscar tu información.");
        return;
      }
      setTalent(data.talent);
      setDemos(data.demos || []);
      setHasPending(!!data.hasPending);
      const hasSecond = (data.demos || []).some((d: Demo) => d.kind === "voice_demo_2");
      const initialMode = hasSecond ? "replace" : "";
      setMode(initialMode);
      setTargetMediaId("");
      setStep("info");
    } catch (err: any) {
      setLookupError(err?.message || "Error");
    } finally {
      setLookingUp(false);
    }
  }

  async function handleSubmit() {
    setSubmitError(null);
    if (!mode) { setSubmitError("Elegí si querés reemplazar o agregar un demo."); return; }
    if (mode === "replace" && !targetMediaId) {
      setSubmitError("Elegí qué demo querés reemplazar.");
      return;
    }
    if (!newFile) { setSubmitError("Subí el nuevo audio."); return; }

    setSubmitting(true);
    try {
      const { url, filename } = await uploadFile(newFile);
      const res = await fetch("/api/voces/actualizar-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: talent?.email,
          mode,
          targetMediaId: mode === "replace" ? targetMediaId : null,
          newAudioUrl: url,
          newAudioFilename: filename,
          newPhone: newPhone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Error enviando la solicitud.");
      setStep("done");
    } catch (err: any) {
      setSubmitError(err?.message || "Error");
    } finally {
      setSubmitting(false);
    }
  }

  const canAdd = !demos.some((d) => d.kind === "voice_demo_2");
  const inputClass = "ds-input [color-scheme:dark]";

  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-10 pb-16 md:pb-10">
      <div className="max-w-2xl mx-auto">

        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4"
            style={{ background: "var(--color-accent-bg)", border: "0.5px solid var(--color-accent-border)" }}>
            <span className="text-[11px] font-[600] tracking-widest uppercase" style={{ color: "var(--color-accent)" }}>Sivar Music</span>
          </span>
          <h1 className="text-[30px] sm:text-[36px] tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
            ¿Ya sos parte de la base de datos y querés actualizar tu información?
          </h1>
          <p className="mt-3 text-[14px]" style={{ color: "var(--color-text-muted)" }}>
            Ingresá el email con el que tenés tu información registrada. Los cambios pasan por aprobación del equipo de Sivar Music.
          </p>
        </div>

        {step === "email" && (
          <SectionCard title="Identificate" subtitle="Necesitamos tu email para encontrar tu perfil.">
            <form onSubmit={handleLookup} noValidate className="flex flex-col gap-4">
              <div>
                <Label required>Email</Label>
                <input type="email" className={inputClass} value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" autoFocus />
                {lookupError && <p className="mt-1.5 text-[12px]" style={{ color: "var(--color-accent)" }}>{lookupError}</p>}
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={lookingUp} className="ds-btn-primary text-[13px] px-6 py-2.5"
                  style={lookingUp ? { opacity: 0.5, cursor: "not-allowed" } : {}}>
                  {lookingUp ? "Buscando…" : "Buscar mi perfil →"}
                </button>
              </div>
            </form>
          </SectionCard>
        )}

        {step === "info" && talent && (
          <div className="flex flex-col gap-5">
            <SectionCard title="Tu perfil" subtitle="Estos son tus datos. El nombre y el email no se pueden modificar desde acá.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre</Label>
                  <input className={inputClass} value={talent.fullName} disabled
                    style={{ opacity: 0.7, cursor: "not-allowed" }} />
                </div>
                <div>
                  <Label>Email</Label>
                  <input className={inputClass} value={talent.email} disabled
                    style={{ opacity: 0.7, cursor: "not-allowed" }} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Teléfono actualizado</Label>
                  <input
                    type="tel"
                    className={inputClass}
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+54 9 11 5555 5555"
                    autoComplete="tel"
                  />
                  <p className="mt-1.5 text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                    Opcional. Dejalo en blanco si no querés cambiarlo. No te mostramos el número anterior por seguridad.
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Tus demos actuales" subtitle="Escuchá los audios que tenemos en la base de datos.">
              {demos.length === 0 ? (
                <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
                  No tenés demos cargados todavía.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {demos.map((d) => (
                    <div key={d.id} className="rounded-[12px] p-4 flex flex-col gap-2"
                      style={{ background: "var(--color-bg-subtle)", border: "0.5px solid var(--color-border-default)" }}>
                      <div className="text-[12px] font-[600] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                        {d.label}
                      </div>
                      <audio controls src={d.url} className="w-full" />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {hasPending && (
              <div className="px-4 py-3 rounded-[10px] text-[13px]"
                style={{ color: "var(--color-accent)", background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.20)" }}>
                Ya tenés una solicitud pendiente de aprobación. Si enviás una nueva, ambas quedarán en revisión.
              </div>
            )}

            <SectionCard title="¿Qué querés hacer?" subtitle="Podés reemplazar un demo existente o agregar un demo extra.">
              <div className="flex flex-col gap-3">
                <label className="flex items-start gap-3 p-4 rounded-[12px] cursor-pointer transition-all"
                  style={mode === "replace"
                    ? { background: "rgba(232,76,43,0.08)", border: "0.5px solid var(--color-accent)" }
                    : { background: "var(--color-bg-subtle)", border: "0.5px solid var(--color-border-default)" }}>
                  <input type="radio" name="mode" checked={mode === "replace"} onChange={() => setMode("replace")}
                    className="mt-1" disabled={demos.length === 0} />
                  <div className="flex-1">
                    <div className="text-[14px] font-[500]" style={{ color: "var(--color-text-primary)" }}>
                      Reemplazar un demo existente
                    </div>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      El audio anterior será descartado y reemplazado por el nuevo.
                    </p>
                    {mode === "replace" && demos.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2">
                        {demos.map((d) => (
                          <label key={d.id} className="flex items-center gap-2 text-[13px] cursor-pointer"
                            style={{ color: "var(--color-text-secondary)" }}>
                            <input type="radio" name="targetMedia" checked={targetMediaId === d.id}
                              onChange={() => setTargetMediaId(d.id)} />
                            {d.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-[12px] cursor-pointer transition-all"
                  style={mode === "add" && canAdd
                    ? { background: "rgba(232,76,43,0.08)", border: "0.5px solid var(--color-accent)" }
                    : { background: "var(--color-bg-subtle)", border: "0.5px solid var(--color-border-default)", opacity: canAdd ? 1 : 0.5 }}>
                  <input type="radio" name="mode" checked={mode === "add"} onChange={() => setMode("add")}
                    className="mt-1" disabled={!canAdd} />
                  <div className="flex-1">
                    <div className="text-[14px] font-[500]" style={{ color: "var(--color-text-primary)" }}>
                      Agregar un demo extra
                    </div>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {canAdd
                        ? "Sumá un demo adicional sin tocar los actuales."
                        : "Ya tenés dos demos cargados. Para sumar uno nuevo, primero reemplazá alguno de los existentes."}
                    </p>
                  </div>
                </label>
              </div>
            </SectionCard>

            <SectionCard title="Nuevo audio" subtitle="Subí el archivo que querés enviar a aprobación.">
              <FileDropZone file={newFile} onChange={setNewFile} />
            </SectionCard>

            {submitError && (
              <div className="px-4 py-3 rounded-[10px] text-[13px]"
                style={{ color: "var(--color-accent)", background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.20)" }}>
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <button type="button" onClick={() => { setStep("email"); setTalent(null); setDemos([]); setNewFile(null); setMode(""); setTargetMediaId(""); setNewPhone(""); }}
                className="ds-btn-secondary text-[13px] px-5 py-2.5">
                ← Cambiar email
              </button>
              <button type="button" onClick={handleSubmit} disabled={submitting} className="ds-btn-primary text-[13px] px-6 py-2.5"
                style={submitting ? { opacity: 0.5, cursor: "not-allowed" } : {}}>
                {submitting ? "Enviando…" : "Enviar a aprobación"}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="rounded-[20px] p-10 flex flex-col items-center gap-6 text-center"
            style={{ background: "var(--color-bg-card)", border: "0.5px solid var(--color-border-default)" }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(232,76,43,0.12)", border: "0.5px solid rgba(232,76,43,0.25)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8" style={{ color: "var(--color-accent)" }}>
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="text-[26px] tracking-[-0.02em] mb-2"
                style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
                Solicitud enviada
              </h2>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Tu nuevo audio está pendiente de aprobación. El equipo de Sivar Music lo revisará y te avisaremos cuando esté listo.
              </p>
            </div>
            <a href="/voces" className="ds-btn-secondary text-[13px] px-6 py-2.5">Volver al catálogo</a>
          </div>
        )}
      </div>
    </main>
  );
}
