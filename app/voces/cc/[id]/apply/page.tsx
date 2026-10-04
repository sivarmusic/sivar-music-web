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
// Presentación: rediseño visual (tema casting); estado, validaciones y payload no cambiaron.

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

  const isOpen = !casting?.deadline || new Date() < new Date(casting.deadline);
  // Solo visual: marca el campo asociado al mensaje de error actual (no valida nada).
  const bad = (re: RegExp) => !!error && re.test(error);
  const errId = "apply-error";
  const describedBy = error ? errId : undefined;

  if (casting && !isOpen && !isAdmin) {
    return (
      <main>
        <ClosedPanel title={casting.title || "Casting"} deadline={casting.deadline} backHref={`/voces/cc/${id}`}>
          <p>Este casting ya cerró y no acepta nuevas postulaciones.</p>
        </ClosedPanel>
      </main>
    );
  }

  return (
    <main>
      <ApplyShell
        projectName={casting ? casting.title || "Sin título" : undefined}
        deadline={casting?.deadline}
        backHref={`/voces/cc/${id}`}
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
                Modo admin — podés enviar sin completar todos los campos.
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
                  <DupNotice id="apply-dup">Este email ya postuló a este casting.</DupNotice>
                ) : null}
              </div>
              <Field label="País">
                {(p) => <input {...p} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Argentina, México…" />}
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
              inputId="cc-apply-audio"
              audioFile={audioFile}
              audioLink={audioLink}
              invalid={bad(/audio|link|MB|archivo/i)}
              describedBy={describedBy}
              errorText={error}
              hint="mp3, wav, ogg. Máximo 10 MB."
              linkLabel="Link (Google Drive, Dropbox…)"
              onFileChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && file.size > 10 * 1024 * 1024) {
                  setError("Máximo 10 MB.");
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
                  const fi = document.getElementById("cc-apply-audio") as HTMLInputElement | null;
                  if (fi) fi.value = "";
                }
              }}
              onRemoveFile={() => {
                setAudioFile(null);
                const fi = document.getElementById("cc-apply-audio") as HTMLInputElement | null;
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
