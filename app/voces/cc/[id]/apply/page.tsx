"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";

// Ported from voces-bds's app/cc/[id]/apply/page.tsx: public cantante
// casting application form. No auth required to submit — /voces/cc/ is
// proxy-allowlisted for anonymous visitors and this page doesn't gate on
// useAuth(); isAdmin only relaxes validation for admins testing the flow.
//  - isAdmin check: /api/auth/me (dropped legacy endpoint) -> useAuth().
//  - API routes: /api/cantantes/casting?id= -> /api/voces/cantantes/casting?id=,
//    /api/cantantes/casting/check -> /api/voces/cantantes/casting/check,
//    /api/cantantes/casting/upload-url -> /api/voces/cantantes/casting/upload-url,
//    /api/cantantes/casting/apply -> /api/voces/cantantes/casting/apply.
//  - Links: /cc/{id} -> /voces/cc/{id}, /cc/{id}/gracias -> /voces/cc/{id}/gracias.

export default function CantanteCastingApplyPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [casting, setCasting] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [homeStudio, setHomeStudio] = useState("no");
  const [onlineSessions, setOnlineSessions] = useState("no");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioLink, setAudioLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverDup, setServerDup] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/voces/cantantes/casting?id=${id}`);
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.error || "No disponible");
        setCasting(j.casting);
      } catch (e: any) { setError(e?.message || "Error"); }
    })();
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      const e = String(email || "").trim().toLowerCase();
      if (!e) { setServerDup(false); return; }
      try {
        const r = await fetch(`/api/voces/cantantes/casting/check?shareId=${id}&email=${encodeURIComponent(e)}`, { cache: "no-store", signal: controller.signal });
        const j = await r.json();
        if (r.ok && j?.ok) setServerDup(!!j.exists);
      } catch {}
    };
    run();
    return () => controller.abort();
  }, [id, email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isAdmin) {
      if (!firstName || !lastName) { setError("Completá nombre y apellido"); return; }
      if (!gender) { setError("Indicá tu género"); return; }
      if (!audioFile && !audioLink.trim()) { setError("Debés adjuntar un audio o un link"); return; }
    }
    setSubmitting(true);
    try {
      let audioUrl: string | null = audioLink.trim() || null;
      if (!audioUrl && audioFile) {
        const ext = audioFile.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "mp3";
        const urlRes = await fetch(`/api/voces/cantantes/casting/upload-url?ext=${ext}&shareId=${encodeURIComponent(String(id || ""))}`);
        const urlData = await urlRes.json();
        if (!urlData?.ok || !urlData.signedUrl) throw new Error("No se pudo iniciar la subida del audio.");
        const uploadRes = await fetch(urlData.signedUrl, { method: "PUT", headers: { "Content-Type": audioFile.type || "audio/mpeg" }, body: audioFile });
        if (!uploadRes.ok) throw new Error("No se pudo subir el audio. Intentá de nuevo.");
        audioUrl = urlData.publicUrl;
      }
      const res = await fetch("/api/voces/cantantes/casting/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId: String(id || ""), firstName, lastName, phone, email, country, gender, homeStudio, onlineSessions, audioUrl }),
      });
      let j: any;
      try { j = await res.json(); } catch { throw new Error("Error en el servidor."); }
      if (!res.ok || !j?.ok) {
        if (res.status === 409) { setError("Este email ya postuló a este casting."); return; }
        throw new Error(j?.error || "Error enviando");
      }
      router.push(`/voces/cc/${id}/gracias`);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "ds-input [color-scheme:dark]";
  const isOpen = !casting?.deadline || new Date() < new Date(casting.deadline);

  if (casting && !isOpen && !isAdmin) {
    return (
      <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-10 flex items-center justify-center">
        <div className="max-w-lg w-full mx-auto text-center rounded-[16px] p-10" style={{ background: "var(--color-bg-card)", border: "0.5px solid var(--color-border-default)" }}>
          <h1 className="text-[24px] mb-3" style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>{casting.title || "Casting"}</h1>
          <p className="text-[14px]" style={{ color: "var(--color-text-muted)" }}>Este casting ya cerró y no acepta nuevas postulaciones.</p>
          <a href={`/voces/cc/${id}`} className="mt-6 inline-block text-[13px]" style={{ color: "#644cc8" }}>Volver al casting</a>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4" style={{ background: "rgba(100,76,200,0.08)", border: "0.5px solid rgba(100,76,200,0.25)" }}>
            <span className="text-[11px] font-[600] tracking-widest uppercase" style={{ color: "#644cc8" }}>Aplicar al casting</span>
          </span>
          {casting && (
            <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
              Proyecto: <span className="font-[500]" style={{ color: "var(--color-text-primary)" }}>{casting.title || "Sin título"}</span>
            </p>
          )}
        </div>

        <div className="rounded-[16px] p-8" style={{ background: "var(--color-bg-card)", border: "0.5px solid var(--color-border-default)" }}>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-5">
            {isAdmin && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]" style={{ background: "rgba(100,76,200,0.08)", border: "0.5px solid rgba(100,76,200,0.25)", color: "#644cc8" }}>
                Modo admin — podés enviar sin completar todos los campos.
              </div>
            )}
            {error && <p className="text-[13px] px-4 py-3 rounded-[10px]" style={{ color: "var(--color-accent)", background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.20)" }}>{error}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>Nombre</label><input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Tu nombre" className={inputClass} /></div>
              <div><label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>Apellido</label><input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Tu apellido" className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>Teléfono</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 9 11 ..." className={inputClass} /></div>
              <div>
                <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className={inputClass} />
                {serverDup && <p className="mt-1.5 text-[12px]" style={{ color: "var(--color-accent)" }}>Este email ya postuló a este casting.</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>País</label><input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Argentina, México…" className={inputClass} /></div>
              <div>
                <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>Género <span style={{ color: "var(--color-accent)" }}>*</span></label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
                  <option value="">Seleccionar…</option>
                  <option value="Male">Masculino</option>
                  <option value="Female">Femenino</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>¿Tenés home studio?</label><select value={homeStudio} onChange={(e) => setHomeStudio(e.target.value)} className={inputClass}><option value="no">No</option><option value="si">Sí</option></select></div>
              <div><label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>¿Disponible para sesiones online?</label><select value={onlineSessions} onChange={(e) => setOnlineSessions(e.target.value)} className={inputClass}><option value="no">No</option><option value="si">Sí</option></select></div>
            </div>

            {/* Audio */}
            <div className="rounded-[12px] p-4" style={{ background: "var(--color-bg-subtle)", border: "0.5px solid var(--color-border-default)" }}>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-[11px] font-[600] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Audio</span>
                <span className="text-[11px] font-[600]" style={{ color: "var(--color-accent)" }}>*</span>
              </div>
              <input id="cc-apply-audio" type="file" accept="audio/*" onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && file.size > 10 * 1024 * 1024) { setError("Máximo 10 MB."); e.target.value = ""; return; }
                setAudioFile(file);
                if (file) setAudioLink("");
              }} className="hidden" />
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => document.getElementById("cc-apply-audio")?.click()} className="ds-btn-secondary text-[12px] py-1.5 px-4">Seleccionar archivo</button>
                <span className="text-[12px] truncate max-w-[14rem]" style={{ color: "var(--color-text-muted)" }}>{audioFile?.name || "Ningún archivo"}</span>
              </div>
              <p className="mt-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>mp3, wav, ogg. Máximo 10 MB.</p>
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px" style={{ background: "var(--color-border-default)" }} />
                <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>o</span>
                <div className="flex-1 h-px" style={{ background: "var(--color-border-default)" }} />
              </div>
              <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>Link (Google Drive, Dropbox…)</label>
              <input type="url" value={audioLink} onChange={(e) => { setAudioLink(e.target.value); if (e.target.value) { setAudioFile(null); const fi = document.getElementById("cc-apply-audio") as HTMLInputElement | null; if (fi) fi.value = ""; } }} placeholder="https://drive.google.com/…" className={inputClass} />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button type="submit" disabled={submitting} className="ds-btn-primary text-[13px] px-6 py-3" style={{ background: submitting ? undefined : "#644cc8", opacity: submitting ? 0.5 : 1 }}>
                {submitting ? "Enviando…" : "Enviar postulación"}
              </button>
              <a href={`/voces/cc/${id}`} className="text-[13px] transition-colors" style={{ color: "var(--color-text-muted)" }}>Volver</a>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
