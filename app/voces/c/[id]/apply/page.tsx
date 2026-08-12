"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";

// Ported from voces-bds's app/c/[id]/apply/page.tsx: public locutor casting
// application form. No auth required to submit — /voces/c/ is
// proxy-allowlisted for anonymous visitors and this page doesn't gate on
// useAuth(); isAdmin here only relaxes validation for admins testing the
// flow (matching the original's isAdmin bypass), never a redirect.
//  - isAdmin check: /api/auth/me (dropped legacy endpoint) -> useAuth().
//  - API routes: /api/casting?id= -> /api/voces/casting?id=,
//    /api/casting/check -> /api/voces/casting/check,
//    /api/casting/upload-url -> /api/voces/casting/upload-url,
//    /api/casting/apply -> /api/voces/casting/apply.
//  - Links: /c/{id} -> /voces/c/{id}, /c/{id}/gracias -> /voces/c/{id}/gracias.
//  - "BDS" -> "Sivar Music" in the admin-mode banner copy.

export default function CastingApplyPage() {
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
        const r = await fetch(`/api/voces/casting?id=${id}`);
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.error || "No disponible");
        setCasting(j.casting);
      } catch (e: any) {
        setError(e?.message || "Error");
      }
    })();
  }, [id]);

  // Verificar en el servidor si ese email ya tiene una postulación vigente (ignora cookies/localStorage)
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      const e = String(email || "").trim().toLowerCase();
      if (!e) { setServerDup(false); return; }
      try {
        const r = await fetch(`/api/voces/casting/check?shareId=${id}&email=${encodeURIComponent(e)}`, { cache: 'no-store', signal: controller.signal });
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
      if (!firstName || !lastName) {
        setError("Completá nombre y apellido");
        return;
      }
      if (!gender) {
        setError("Indicá si sos masculino o femenino");
        return;
      }
      if (!audioFile && !audioLink.trim()) {
        setError("Debés adjuntar un audio o un link (Google Drive, Dropbox…)");
        return;
      }
    }
    setSubmitting(true);
    try {
      // Upload audio directly to Supabase (bypasses Next.js body limit)
      let audioUrl: string | null = audioLink.trim() || null;
      if (!audioUrl && audioFile) {
        const ext = audioFile.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "mp3";
        const urlRes = await fetch(`/api/voces/casting/upload-url?ext=${ext}&shareId=${encodeURIComponent(String(id || ""))}`);
        const urlData = await urlRes.json();
        if (!urlData?.ok || !urlData.signedUrl) throw new Error("No se pudo iniciar la subida del audio.");
        const uploadRes = await fetch(urlData.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": audioFile.type || "audio/mpeg" },
          body: audioFile,
        });
        if (!uploadRes.ok) throw new Error("No se pudo subir el audio. Intentá de nuevo.");
        audioUrl = urlData.publicUrl;
      }

      const res = await fetch("/api/voces/casting/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareId: String(id || ""),
          firstName,
          lastName,
          phone,
          email,
          country,
          gender,
          homeStudio,
          onlineSessions,
          audioUrl,
        }),
      });
      let j: any;
      try {
        j = await res.json();
      } catch {
        throw new Error("Hubo un error en el servidor. Intentá de nuevo.");
      }
      if (!res.ok || !j?.ok) {
        if (res.status === 409) {
          setError("Este email ya postuló a este casting.");
          try { if (email) localStorage.setItem(`casting_applied_${id}:${String(email).trim().toLowerCase()}`, new Date().toISOString()); } catch {}
          return;
        }
        throw new Error(j?.error || "Error enviando");
      }
      try { if (email) localStorage.setItem(`casting_applied_${id}:${String(email).trim().toLowerCase()}`, new Date().toISOString()); } catch {}
      router.push(`/voces/c/${id}/gracias`);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "ds-input [color-scheme:dark]";
  const selectClass = "ds-input [color-scheme:dark]";
  const isOpen = !casting?.deadline || new Date() < new Date(casting.deadline);

  if (casting && !isOpen && !isAdmin) {
    return (
      <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-10 flex items-center justify-center">
        <div className="max-w-lg w-full mx-auto text-center">
          <div className="rounded-[16px] p-10 flex flex-col items-center gap-6"
            style={{ background: "var(--color-bg-card)", border: "0.5px solid var(--color-border-default)" }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.12)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: "var(--color-text-muted)" }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3"
                style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.12)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(150,150,150,0.6)" }} />
                <span className="text-[11px] font-[600] tracking-widest uppercase" style={{ color: "rgba(150,150,150,0.9)" }}>
                  Casting terminado
                </span>
              </span>
              <h1 className="text-[24px] tracking-[-0.02em]"
                style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
                {casting.title || "Casting"}
              </h1>
              {casting.deadline && (
                <p className="mt-2 text-[13px]" style={{ color: "var(--color-text-muted)" }}>
                  Cerró el {new Date(casting.deadline).toLocaleString("es-AR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} hs
                </p>
              )}
            </div>
            <div className="rounded-[12px] px-5 py-4 text-center"
              style={{ background: "var(--color-bg-subtle)", border: "0.5px solid var(--color-border-default)" }}>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Este casting ya no acepta nuevas postulaciones.
              </p>
              <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                Si considerás que tu perfil es ideal para este proyecto y querés que lo tengamos en cuenta,
                escribinos directamente a través de nuestras redes o canales de contacto habituales con el equipo de{" "}
                <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>Sivar Music</span>.
              </p>
            </div>
            <a href={`/voces/c/${id}`} className="text-[13px] transition-colors" style={{ color: "var(--color-accent)" }}>
              Volver al casting
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4"
            style={{ background: "var(--color-accent-bg)", border: "0.5px solid var(--color-accent-border)" }}>
            <span className="text-[11px] font-[600] tracking-widest uppercase" style={{ color: "var(--color-accent)" }}>Aplicar al casting</span>
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
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
                style={{ background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.25)", color: "var(--color-accent)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                Modo admin — podés enviar sin completar los campos obligatorios y aunque el casting esté cerrado o el email ya haya postulado.
              </div>
            )}
            {error && (
              <p className="text-[13px] px-4 py-3 rounded-[10px]"
                style={{ color: "var(--color-accent)", background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.20)" }}>
                {error}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>Nombre</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Tu nombre" className={inputClass} />
              </div>
              <div>
                <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>Apellido</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Tu apellido" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>Teléfono</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 9 11 ..." className={inputClass} />
              </div>
              <div>
                <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className={inputClass} />
                {serverDup ? (
                  <p className="mt-1.5 text-[12px]" style={{ color: "var(--color-accent)" }}>Este email ya postuló a este casting. Si quieres volver a enviar, comunicate con el equipo de Sivar Music.</p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>País de residencia</label>
                <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Argentina, México, España…" className={inputClass} />
              </div>
              <div>
                <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                  Género <span style={{ color: "var(--color-accent)" }}>*</span>
                </label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className={selectClass}>
                  <option value="">Seleccionar…</option>
                  <option value="Male">Masculino</option>
                  <option value="Female">Femenino</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>¿Tenés home studio?</label>
                <select value={homeStudio} onChange={(e) => setHomeStudio(e.target.value)} className={selectClass}>
                  <option value="no">No</option>
                  <option value="si">Sí</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>¿Disponible para sesiones online?</label>
                <select value={onlineSessions} onChange={(e) => setOnlineSessions(e.target.value)} className={selectClass}>
                  <option value="no">No</option>
                  <option value="si">Sí</option>
                </select>
              </div>
            </div>

            {/* Audio upload */}
            <div className="rounded-[12px] p-4" style={{ background: "var(--color-bg-subtle)", border: "0.5px solid var(--color-border-default)" }}>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-[11px] font-[600] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Audio</span>
                <span className="text-[11px] font-[600]" style={{ color: "var(--color-accent)" }}>*</span>
                <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>(requerido)</span>
              </div>
              <input id="apply-audio" type="file" accept="audio/*" onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && file.size > 10 * 1024 * 1024) {
                  setError("El archivo es demasiado grande. Máximo 10 MB.");
                  e.target.value = "";
                  return;
                }
                setAudioFile(file);
                if (file) setAudioLink("");
              }} className="hidden" />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => document.getElementById("apply-audio")?.click()}
                  className="ds-btn-secondary text-[12px] py-1.5 px-4"
                >
                  Seleccionar archivo
                </button>
                <span className="text-[12px] truncate max-w-[14rem]" style={{ color: "var(--color-text-muted)" }}>{audioFile?.name || "Ningún archivo"}</span>
              </div>
              <p className="mt-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>Formatos aceptados: mp3, wav, ogg, etc. Máximo 10 MB.</p>

              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px" style={{ background: "var(--color-border-default)" }} />
                <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>o</span>
                <div className="flex-1 h-px" style={{ background: "var(--color-border-default)" }} />
              </div>

              <div>
                <label className="block text-[11px] font-[600] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>Enviar link (Google Drive, Dropbox…)</label>
                <input
                  type="url"
                  value={audioLink}
                  onChange={(e) => {
                    setAudioLink(e.target.value);
                    if (e.target.value) {
                      setAudioFile(null);
                      const fi = document.getElementById("apply-audio") as HTMLInputElement | null;
                      if (fi) fi.value = "";
                    }
                  }}
                  placeholder="https://drive.google.com/…"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="ds-btn-primary text-[13px] px-6 py-3"
                style={submitting ? { opacity: 0.5, cursor: "not-allowed" } : {}}
              >
                {submitting ? "Enviando…" : "Enviar postulación"}
              </button>
              <a href={`/voces/c/${id}`} className="text-[13px] transition-colors" style={{ color: "var(--color-text-muted)" }}>
                Volver
              </a>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
