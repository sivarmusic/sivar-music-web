"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";
import {
  AdminBanner,
  ApplyShell,
  AudioField,
  ClosedPanel,
  DupNotice,
  ErrorBanner,
  Field,
  Segmented,
  SelectWrap,
  SubmitButton,
} from "@/app/voces/components/casting/ApplyParts";
import Section from "@/app/voces/components/casting/Section";

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
// Presentación: rediseño visual (tema casting); estado, validaciones y payload no cambiaron.

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

  const isOpen = !casting?.deadline || new Date() < new Date(casting.deadline);
  // Solo visual: marca el campo asociado al mensaje de error actual (no valida nada).
  const bad = (re: RegExp) => !!error && re.test(error);
  const errId = "apply-error";
  const describedBy = error ? errId : undefined;

  if (casting && !isOpen && !isAdmin) {
    return (
      <main>
        <ClosedPanel title={casting.title || "Casting"} deadline={casting.deadline} backHref={`/voces/c/${id}`}>
          <p>Este casting ya no acepta nuevas postulaciones.</p>
          <p>
            Si considerás que tu perfil es ideal para este proyecto y querés que lo tengamos en cuenta,
            escribinos directamente a través de nuestras redes o canales de contacto habituales con el equipo de{" "}
            <span className="font-[600] text-cs-paper">Sivar Music</span>.
          </p>
        </ClosedPanel>
      </main>
    );
  }

  return (
    <main>
      <ApplyShell
        projectName={casting ? casting.title || "Sin título" : undefined}
        deadline={casting?.deadline}
        backHref={`/voces/c/${id}`}
        index={[
          { id: "datos", label: "Tus datos" },
          { id: "setup", label: "Tu setup" },
          { id: "audio", label: "Audio" },
        ]}
      >
        <form onSubmit={onSubmit} className="space-y-12">
          <div className="space-y-4 empty:hidden">
            {isAdmin && (
              <AdminBanner>
                Modo admin — podés enviar sin completar los campos obligatorios y aunque el casting esté cerrado o el email ya haya postulado.
              </AdminBanner>
            )}
            <ErrorBanner id={errId} message={error} />
          </div>

          <Section id="datos" n={1} title="Tus datos">
            <div className="cs-grid">
              <Field label="Nombre" invalid={bad(/nombre/i)} describedBy={describedBy} errorText={error}>
                {(p) => <input {...p} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Tu nombre" />}
              </Field>
              <Field label="Apellido" invalid={bad(/apellido/i)} describedBy={describedBy} errorText={error}>
                {(p) => <input {...p} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Tu apellido" />}
              </Field>
              <Field label="Teléfono">
                {(p) => <input {...p} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 9 11 ..." />}
              </Field>
              <div>
                <Field label="Email" describedBy={serverDup ? "apply-dup" : undefined}>
                  {(p) => <input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />}
                </Field>
                {serverDup ? (
                  <DupNotice id="apply-dup">Este email ya postuló a este casting. Si quieres volver a enviar, comunicate con el equipo de Sivar Music.</DupNotice>
                ) : null}
              </div>
              <Field label="País de residencia">
                {(p) => <input {...p} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Argentina, México, España…" />}
              </Field>
              <Field label="Género" required invalid={bad(/masculino|femenino/i)} describedBy={describedBy} errorText={error}>
                {(p) => (
                  <SelectWrap>
                    <select {...p} value={gender} onChange={(e) => setGender(e.target.value)}>
                      <option value="">Seleccionar…</option>
                      <option value="Male">Masculino</option>
                      <option value="Female">Femenino</option>
                    </select>
                  </SelectWrap>
                )}
              </Field>
            </div>
          </Section>

          <Section id="setup" n={2} title="Tu setup">
            <div className="cs-grid">
              <Segmented
                legend="¿Tenés home studio?"
                name="homeStudio"
                value={homeStudio}
                onChange={setHomeStudio}
                options={[{ value: "no", label: "No" }, { value: "si", label: "Sí" }]}
              />
              <Segmented
                legend="¿Disponible para sesiones online?"
                name="onlineSessions"
                value={onlineSessions}
                onChange={setOnlineSessions}
                options={[{ value: "no", label: "No" }, { value: "si", label: "Sí" }]}
              />
            </div>
          </Section>

          <Section id="audio" n={3} title="Audio">
            <AudioField
              inputId="apply-audio"
              audioFile={audioFile}
              audioLink={audioLink}
              invalid={bad(/audio|link|MB|archivo/i)}
              describedBy={describedBy}
              errorText={error}
              hint="Formatos aceptados: mp3, wav, ogg, etc. Máximo 10 MB."
              linkLabel="Enviar link (Google Drive, Dropbox…)"
              onFileChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && file.size > 10 * 1024 * 1024) {
                  setError("El archivo es demasiado grande. Máximo 10 MB.");
                  e.target.value = "";
                  return;
                }
                setAudioFile(file);
                if (file) setAudioLink("");
              }}
              onLinkChange={(v) => {
                setAudioLink(v);
                if (v) {
                  setAudioFile(null);
                  const fi = document.getElementById("apply-audio") as HTMLInputElement | null;
                  if (fi) fi.value = "";
                }
              }}
              onRemoveFile={() => {
                setAudioFile(null);
                const fi = document.getElementById("apply-audio") as HTMLInputElement | null;
                if (fi) fi.value = "";
              }}
            />
          </Section>

          <SubmitButton submitting={submitting} />
        </form>
      </ApplyShell>
    </main>
  );
}
