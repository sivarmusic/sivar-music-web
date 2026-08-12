"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";
import AudioPlayer from "@/app/voces/components/AudioPlayer";
import Breadcrumbs from "@/app/voces/components/Breadcrumbs";

// Ported from voces-bds's app/admin/casting/results/[id]/page.tsx.
//  - Auth: /api/auth/me -> useAuth().
//  - API routes: /api/casting/results/[id] -> /api/voces/admin/casting/results/[id],
//    /api/admin/casting/application/* -> /api/voces/admin/casting/application/*,
//    /api/casting/upload-url -> /api/voces/admin/casting/upload-url,
//    /api/admin/casting/results/[id]/download -> /api/voces/admin/casting/results/[id]/download.
//  - purgeRemote checkbox: the original only showed it for legacy
//    "/api/demo?id=..." Drive-proxy audio; that proxy doesn't exist here, so
//    it now shows for any Supabase-hosted audio (matching what
//    application/delete/route.ts's purgeRemote branch actually purges).
//  - Filenames: "BDS CASTING ..." -> "SIVAR MUSIC CASTING ...".

function isUploadedAudio(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("supabase.co") || url.includes("/storage/v1/");
}

function isExternalLink(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("http") && !url.includes("supabase.co") && !url.startsWith("/api/");
}

export default function AdminCastingResultsDetailPage() {
  const routeParams = useParams() as { id?: string };
  const id = String(routeParams?.id || ""); // shareId
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [casting, setCasting] = useState<any | null>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [purgeMap, setPurgeMap] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rating, setRating] = useState<Record<string, number>>({});
  const [importingId, setImportingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ firstName: "", lastName: "", phone: "", email: "", country: "", gender: "", homeStudio: "no", onlineSessions: "no" });
  const [addAudioFile, setAddAudioFile] = useState<File | null>(null);
  const [addAudioLink, setAddAudioLink] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/voces/login");
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const r = await fetch(`/api/voces/admin/casting/results/${id}`, { cache: "no-store" });
        let j: any = null;
        try { j = await r.json(); } catch { j = { ok: false, error: `HTTP ${r.status}` }; }
        if (!r.ok || !j?.ok) throw new Error(j?.error || "Error");
        setCasting(j.casting);
        setApps(j.applications || []);
      } catch (e: any) {
        setError(e?.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isAdmin]);

  useEffect(() => {
    if (!confirmId) return;
    const onDoc = () => setConfirmId(null);
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [confirmId]);

  async function onImportAudio(appId: string, externalUrl: string) {
    setImportingId(appId);
    try {
      const r = await fetch("/api/voces/admin/casting/application/import-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, audioUrl: externalUrl }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Error importando");
      setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, audioUrl: j.audioUrl, audioLinkOriginal: externalUrl } : a)));
      setToast("Audio importado a Supabase correctamente");
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) {
      setToast(`Error: ${e?.message || "No se pudo importar"}`);
      setTimeout(() => setToast(null), 4000);
    } finally {
      setImportingId(null);
    }
  }

  async function onReplaceAudio(appId: string, shareId: string, file: File) {
    if (file.size > 50 * 1024 * 1024) {
      setToast("El archivo supera los 50 MB"); setTimeout(() => setToast(null), 3000); return;
    }
    setUploadingId(appId);
    try {
      const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "mp3";
      const urlRes = await fetch(`/api/voces/admin/casting/upload-url?ext=${ext}&shareId=${encodeURIComponent(shareId)}`);
      const urlData = await urlRes.json();
      if (!urlData?.ok || !urlData.signedUrl) throw new Error("No se pudo iniciar la subida");
      const uploadRes = await fetch(urlData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "audio/mpeg" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Error subiendo el archivo");
      const r = await fetch("/api/voces/admin/casting/application/update-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, audioUrl: urlData.publicUrl }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Error guardando");
      setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, audioUrl: urlData.publicUrl } : a)));
      setToast("Audio reemplazado correctamente");
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) {
      setToast(`Error: ${e?.message || "No se pudo subir"}`);
      setTimeout(() => setToast(null), 4000);
    } finally {
      setUploadingId(null);
    }
  }

  async function onAddApplication(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!addForm.firstName || !addForm.lastName) { setAddError("Nombre y apellido son obligatorios"); return; }
    setAddSubmitting(true);
    try {
      let audioUrl: string | null = addAudioLink.trim() || null;
      if (!audioUrl && addAudioFile) {
        const ext = addAudioFile.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "mp3";
        const urlRes = await fetch(`/api/voces/admin/casting/upload-url?ext=${ext}&shareId=${encodeURIComponent(id)}`);
        const urlData = await urlRes.json();
        if (!urlData?.ok || !urlData.signedUrl) throw new Error("No se pudo iniciar la subida del audio");
        const uploadRes = await fetch(urlData.signedUrl, { method: "PUT", headers: { "Content-Type": addAudioFile.type || "audio/mpeg" }, body: addAudioFile });
        if (!uploadRes.ok) throw new Error("Error subiendo el audio");
        audioUrl = urlData.publicUrl;
      }
      const r = await fetch("/api/voces/admin/casting/application/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId: id, ...addForm, audioUrl }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Error creando postulación");
      setApps((prev) => [j.application, ...prev]);
      setShowAddModal(false);
      setAddForm({ firstName: "", lastName: "", phone: "", email: "", country: "", gender: "", homeStudio: "no", onlineSessions: "no" });
      setAddAudioFile(null);
      setAddAudioLink("");
      setToast("Postulación agregada");
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) {
      setAddError(e?.message || "Error");
    } finally {
      setAddSubmitting(false);
    }
  }

  async function onToggleSelected(app: any) {
    const newSelected = !app.selected;
    setSelectingId(app.id);
    try {
      const r = await fetch("/api/voces/admin/casting/application/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: app.id, castingId: app.castingId, selected: newSelected }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Error");
      setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, selected: newSelected } : a)));
      setToast(newSelected ? `${app.firstName} ${app.lastName} marcado como locutor elegido` : "Selección removida");
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) {
      setToast(`Error: ${e?.message || "No se pudo guardar"}`);
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSelectingId(null);
    }
  }

  function copyEmails() {
    const notSelected = apps.filter((a) => a.email && !a.selected);
    const emails = notSelected.map((a) => a.email).join(", ");
    if (!emails) {
      setToast("No hay emails para copiar");
      setTimeout(() => setToast(null), 2500);
      return;
    }
    navigator.clipboard.writeText(emails).then(() => {
      const count = notSelected.length;
      setToast(`${count} email${count !== 1 ? "s" : ""} copiado${count !== 1 ? "s" : ""} al portapapeles`);
      setTimeout(() => setToast(null), 3000);
    }).catch(() => {
      setToast("No se pudo copiar al portapapeles");
      setTimeout(() => setToast(null), 3000);
    });
  }

  async function onDelete(appId: string) {
    setDeletingId(appId);
    try {
      const r = await fetch("/api/voces/admin/casting/application/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: appId, purgeRemote: !!purgeMap[appId] }) });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Error eliminando");
      setApps((prev) => prev.filter((a) => a.id !== appId));
    } catch {
      // no-op simple; podríamos mostrar toast si se implementa
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  if (authLoading || !isAdmin) return <main className="p-6">Cargando…</main>;

  return (
    <>
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Breadcrumbs
            items={[
              { label: "Castings", href: "/voces/admin/casting" },
              { label: "Resultados", href: "/voces/admin/casting/results" },
              { label: casting?.title || "Detalle" },
            ]}
            className="text-blue-700 mb-2 px-1"
          />
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">{casting?.title || "Resultados"}</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="rounded border border-blue-300 bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100"
              >+ Agregar postulación</button>
              <button
                onClick={copyEmails}
                className="inline-flex items-center gap-1.5 rounded border border-violet-300 bg-violet-50 px-3 py-1 text-xs text-violet-700 hover:bg-violet-100"
                title={apps.some((a) => a.selected) ? "Copia todos los emails excepto los de los locutores elegidos" : "Copia todos los emails de los postulantes"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                  <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                  <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                </svg>
                Copiar emails
              </button>
              <button
                disabled={downloading}
                onClick={async () => {
                  setDownloading(true);
                  try {
                    const res = await fetch(`/api/voces/admin/casting/results/${id}/download`);
                    if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j?.error || `Error ${res.status}`); }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `SIVAR MUSIC CASTING ${casting?.title || id}.zip`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (e: any) {
                    setToast(`Error: ${e?.message || "No se pudo descargar"}`);
                    setTimeout(() => setToast(null), 4000);
                  } finally {
                    setDownloading(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <>
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Preparando ZIP…
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                    </svg>
                    Descargar audios
                  </>
                )}
              </button>
              <button
                onClick={async () => {
                  try { await navigator.clipboard.writeText(`${location.origin}/voces/r/${id}`); setToast("Link copiado"); setTimeout(() => setToast(null), 2000); } catch {}
                }}
                className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >Compartir</button>
            </div>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-gray-600">Cargando…</p>
          ) : error ? (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          ) : (
            <section className="mt-6">
              <div className="text-xs text-gray-500">{casting?.createdAt ? new Date(casting.createdAt).toLocaleString() : null}</div>
              {apps.length ? (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {apps.map((a) => (
                    <article key={a.id} className={`relative rounded-2xl border p-4 shadow-sm transition-colors ${a.selected ? "border-emerald-400 bg-emerald-50/40 ring-1 ring-emerald-300" : "border-gray-200 bg-white"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{a.firstName} {a.lastName}</span>
                            {a.selected && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                </svg>
                                Voz elegida
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</div>
                        </div>
                        <span className={`text-[11px] rounded-full px-2 py-0.5 ${isUploadedAudio(a.audioUrl) ? "bg-emerald-50 text-emerald-700" : isExternalLink(a.audioUrl) ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                          {isUploadedAudio(a.audioUrl) ? "Audio recibido" : isExternalLink(a.audioUrl) ? "Link recibido" : "Sin audio"}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                        {a.email ? <span>Email: <a href={`mailto:${a.email}`} className="underline">{a.email}</a></span> : null}
                        {a.phone ? <span>Tel: {a.phone}</span> : null}
                        {a.country ? <span>País: {a.country}</span> : null}
                        {a.gender ? <span>Género: {a.gender === "Female" ? "Femenino" : a.gender === "Male" ? "Masculino" : a.gender}</span> : null}
                        <span>Home studio: {a.homeStudio ? "Sí" : "No"}</span>
                        <span>Sesiones online: {a.onlineSessions ? "Sí" : "No"}</span>
                      </div>
                      <div className="mt-3">
                        {isUploadedAudio(a.audioUrl) ? (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <AudioPlayer src={a.audioUrl} ariaLabel={`Audio de ${a.firstName} ${a.lastName}`} />
                              <a
                                href={a.audioUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Descargar audio"
                                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                  <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                                </svg>
                              </a>
                            </div>
                            {a.audioLinkOriginal ? (
                              <a
                                href={a.audioLinkOriginal}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 underline truncate max-w-full"
                                title={a.audioLinkOriginal}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                                  <path d="M15.75 2.25H21a.75.75 0 01.75.75v5.25a.75.75 0 01-1.5 0V4.81L8.03 17.03a.75.75 0 01-1.06-1.06L19.19 3.75h-3.44a.75.75 0 010-1.5z" />
                                  <path d="M3 7.5A.75.75 0 013.75 6.75h6a.75.75 0 010 1.5H4.5v12h12V13.5a.75.75 0 011.5 0v6.75A.75.75 0 0117.25 21H3.75A.75.75 0 013 20.25V7.5z" />
                                </svg>
                                Link original
                              </a>
                            ) : null}
                          </div>
                        ) : isExternalLink(a.audioUrl) ? (
                          <div className="flex flex-col gap-2">
                            <a
                              href={a.audioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 underline break-all"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                                <path d="M15.75 2.25H21a.75.75 0 01.75.75v5.25a.75.75 0 01-1.5 0V4.81L8.03 17.03a.75.75 0 01-1.06-1.06L19.19 3.75h-3.44a.75.75 0 010-1.5z" />
                                <path d="M3 7.5A.75.75 0 013.75 6.75h6a.75.75 0 010 1.5H4.5v12h12V13.5a.75.75 0 011.5 0v6.75A.75.75 0 0117.25 21H3.75A.75.75 0 013 20.25V7.5z" />
                              </svg>
                              {a.audioUrl}
                            </a>
                            <button
                              onClick={() => onImportAudio(a.id, a.audioUrl)}
                              disabled={importingId === a.id}
                              className="self-start inline-flex items-center gap-1.5 rounded-md border border-blue-300 px-3 py-1 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {importingId === a.id ? (
                                <>
                                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                  </svg>
                                  Importando…
                                </>
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                                    <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                                  </svg>
                                  Importar audio a Supabase
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Sin audio</div>
                        )}
                      </div>

                      {/* Reemplazar / subir audio manualmente */}
                      <div className="mt-2">
                        <input
                          id={`replace-audio-${a.id}`}
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) { onReplaceAudio(a.id, a.shareId || id, file); e.target.value = ""; }
                          }}
                        />
                        <button
                          onClick={() => document.getElementById(`replace-audio-${a.id}`)?.click()}
                          disabled={uploadingId === a.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-[11px] text-gray-500 hover:text-gray-800 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {uploadingId === a.id ? (
                            <>
                              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                              </svg>
                              Subiendo…
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                                <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                              </svg>
                              {a.audioUrl ? "Reemplazar audio" : "Subir audio"}
                            </>
                          )}
                        </button>
                      </div>

                      <div className="mt-3">
                        <button
                          onClick={() => onToggleSelected(a)}
                          disabled={selectingId === a.id}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            a.selected
                              ? "border-emerald-400 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "border-gray-300 bg-white text-gray-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
                          }`}
                        >
                          {selectingId === a.id ? (
                            <>
                              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                              </svg>
                              Guardando…
                            </>
                          ) : a.selected ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                              </svg>
                              Locutor elegido
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 opacity-50">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                              </svg>
                              Marcar como elegido
                            </>
                          )}
                        </button>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => setRating((prev) => ({ ...prev, [a.id]: n }))}
                            className={`text-sm ${rating[a.id] >= n ? "text-yellow-500" : "text-gray-300"}`}
                            title={`Puntaje ${n}`}
                          >
                            ★
                          </button>
                        ))}
                        <span className="text-xs text-gray-400">{rating[a.id] ? `${rating[a.id]}/5` : "Sin score"}</span>
                      </div>
                      <div className="mt-3">
                        <textarea
                          value={notes[a.id] || ""}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          placeholder="Notas internas…"
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          rows={2}
                        />
                      </div>

                      {/* Botón eliminar */}
                      <button
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-red-600 z-30"
                        title="Eliminar postulación"
                        onClick={(e) => { e.stopPropagation(); setConfirmId((prev) => (prev === a.id ? null : a.id)); }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5zM8 12.75a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {confirmId === a.id && (
                        <div className="absolute top-10 right-2 bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-72 z-40" onClick={(e) => e.stopPropagation()}>
                          <div className="text-sm font-medium text-gray-900">Eliminar esta postulación</div>
                          <p className="text-xs text-gray-600 mt-1">Esta acción no se puede deshacer.</p>
                          {isUploadedAudio(a.audioUrl) ? (
                            <label className="mt-2 flex items-center gap-2 text-xs text-gray-700">
                              <input
                                type="checkbox"
                                checked={!!purgeMap[a.id]}
                                onChange={(e) => setPurgeMap((prev) => ({ ...prev, [a.id]: e.target.checked }))}
                              />
                              Eliminar también el audio subido
                            </label>
                          ) : null}
                          <p className="mt-2 text-[11px] text-gray-500">Esta acción elimina la postulación de forma permanente.</p>
                          <div className="mt-3 flex items-center justify-end gap-2">
                            <button className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => setConfirmId(null)}>Cancelar</button>
                            <button className={`px-3 py-1.5 text-xs rounded border ${deletingId === a.id ? "border-red-200 text-red-300 cursor-not-allowed" : "border-red-300 text-red-700 hover:bg-red-50"}`} onClick={() => onDelete(a.id)} disabled={deletingId === a.id}>{deletingId === a.id ? "Eliminando…" : "Eliminar"}</button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-600">Sin postulaciones aún.</p>
              )}
            </section>
          )}
        </div>
      </main>
      {toast ? (<div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-3 py-2 rounded-md shadow-lg z-[120]">{toast}</div>) : null}

      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900">Agregar postulación manual</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {addError && <p className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>}

            <form onSubmit={onAddApplication} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Nombre *</label>
                  <input value={addForm.firstName} onChange={(e) => setAddForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="Nombre" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Apellido *</label>
                  <input value={addForm.lastName} onChange={(e) => setAddForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Apellido" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Email</label>
                  <input type="email" value={addForm.email} onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@ejemplo.com" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Teléfono</label>
                  <input value={addForm.phone} onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+54 9 11..." className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">País</label>
                  <input value={addForm.country} onChange={(e) => setAddForm((p) => ({ ...p, country: e.target.value }))} placeholder="Argentina, México…" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Género</label>
                  <select value={addForm.gender} onChange={(e) => setAddForm((p) => ({ ...p, gender: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="">—</option>
                    <option value="Male">Masculino</option>
                    <option value="Female">Femenino</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Home studio</label>
                  <select value={addForm.homeStudio} onChange={(e) => setAddForm((p) => ({ ...p, homeStudio: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Sesiones online</label>
                  <select value={addForm.onlineSessions} onChange={(e) => setAddForm((p) => ({ ...p, onlineSessions: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-3">Audio (opcional)</div>
                <input id="add-audio-file" type="file" accept="audio/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0] || null; setAddAudioFile(f); if (f) setAddAudioLink(""); }} />
                <div className="flex items-center gap-3 mb-3">
                  <button type="button" onClick={() => document.getElementById("add-audio-file")?.click()}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-white">
                    Seleccionar archivo
                  </button>
                  <span className="text-xs text-gray-400 truncate max-w-[12rem]">{addAudioFile?.name || "Ningún archivo"}</span>
                </div>
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[11px] text-gray-400">o</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <input type="url" value={addAudioLink}
                  onChange={(e) => { setAddAudioLink(e.target.value); if (e.target.value) { setAddAudioFile(null); const el = document.getElementById("add-audio-file") as HTMLInputElement | null; if (el) el.value = ""; } }}
                  placeholder="https://…"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={addSubmitting} className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {addSubmitting ? "Guardando…" : "Agregar postulación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
