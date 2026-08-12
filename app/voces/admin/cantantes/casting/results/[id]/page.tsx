"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";
import AudioPlayer from "@/app/voces/components/AudioPlayer";

// Ported from voces-bds's app/admin/cantantes/casting/results/[id]/page.tsx.
//  - Auth: /api/auth/me -> useAuth(), same convention as the sibling pages
//    built earlier in this batch (app/voces/admin/cantantes/casting/page.tsx,
//    .../casting/candidates/[id]/page.tsx).
//  - API routes: /api/admin/cantantes/casting/results/[id] -> /api/voces/admin/cantantes/casting/results/[id],
//    /api/admin/cantantes/casting/application/{select,import-audio,update-audio,delete,create}
//      -> /api/voces/admin/cantantes/casting/application/{...} (already built this batch),
//    /api/cantantes/casting/upload-url -> /api/voces/admin/cantantes/casting/upload-url
//      (GET branch, see that route's comment for why it merges two original endpoints),
//    /api/admin/cantantes/casting/results/[id]/download -> /api/voces/admin/cantantes/casting/results/[id]/download.
//  - Links: /admin/cantantes/casting/results -> /voces/admin/cantantes/casting/results,
//    /cr/[id] (public results share page, not yet built) -> /voces/cr/[id],
//    matching the locutor-side app/voces/admin/casting/results/[id]/page.tsx's
//    forward-reference to /voces/r/[id].
//  - Zip filename: "BDS CANTANTES ..." -> "SIVAR CANTANTES ..." (brand swap).

function isUploaded(url: string | null | undefined) {
  if (!url) return false;
  return url.includes("supabase.co") || url.includes("/storage/v1/");
}
function isExternal(url: string | null | undefined) {
  if (!url) return false;
  return url.startsWith("http") && !url.includes("supabase.co");
}

export default function AdminCantantesCastingResultDetailPage() {
  const { id } = useParams() as { id?: string }; // shareId
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [casting, setCasting] = useState<any | null>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [rating, setRating] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState(false);
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
    if (!confirmId) return;
    const fn = () => setConfirmId(null);
    document.addEventListener("click", fn);
    return () => document.removeEventListener("click", fn);
  }, [confirmId]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/voces/admin/cantantes/casting/results/${id}`, { cache: "no-store" });
        const j = await r.json().catch(() => ({ ok: false, error: `HTTP ${r.status}` }));
        if (!r.ok || !j?.ok) throw new Error(j?.error || "Error");
        setCasting(j.casting);
        setApps(j.applications || []);
      } catch (e: any) { setError(e?.message || "Error"); }
      finally { setLoading(false); }
    })();
  }, [id, isAdmin]);

  async function onToggleSelected(app: any) {
    const newSel = !app.selected;
    setSelectingId(app.id);
    try {
      const r = await fetch("/api/voces/admin/cantantes/casting/application/select", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId: app.id, selected: newSel }) });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Error");
      setApps((p) => p.map((a) => a.id === app.id ? { ...a, selected: newSel } : a));
      setToast(newSel ? "Marcado como elegido" : "Selección removida");
      setTimeout(() => setToast(null), 2500);
    } catch (e: any) { setToast(`Error: ${e?.message}`); setTimeout(() => setToast(null), 3000); }
    finally { setSelectingId(null); }
  }

  async function onImportAudio(appId: string, url: string) {
    setImportingId(appId);
    try {
      const r = await fetch("/api/voces/admin/cantantes/casting/application/import-audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId: appId, audioUrl: url }) });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Error");
      setApps((p) => p.map((a) => a.id === appId ? { ...a, audioUrl: j.audioUrl, audioLinkOriginal: url } : a));
      setToast("Audio importado"); setTimeout(() => setToast(null), 3000);
    } catch (e: any) { setToast(`Error: ${e?.message}`); setTimeout(() => setToast(null), 3000); }
    finally { setImportingId(null); }
  }

  async function onReplaceAudio(appId: string, shareId: string, file: File) {
    setUploadingId(appId);
    try {
      const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "mp3";
      const urlRes = await fetch(`/api/voces/admin/cantantes/casting/upload-url?ext=${ext}&shareId=${encodeURIComponent(shareId)}`);
      const urlData = await urlRes.json();
      if (!urlData?.ok) throw new Error("No se pudo iniciar la subida");
      await fetch(urlData.signedUrl, { method: "PUT", headers: { "Content-Type": file.type || "audio/mpeg" }, body: file });
      const r = await fetch("/api/voces/admin/cantantes/casting/application/update-audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId: appId, audioUrl: urlData.publicUrl }) });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Error");
      setApps((p) => p.map((a) => a.id === appId ? { ...a, audioUrl: urlData.publicUrl } : a));
      setToast("Audio reemplazado"); setTimeout(() => setToast(null), 3000);
    } catch (e: any) { setToast(`Error: ${e?.message}`); setTimeout(() => setToast(null), 3000); }
    finally { setUploadingId(null); }
  }

  async function onDelete(appId: string) {
    setDeletingId(appId);
    try {
      const r = await fetch("/api/voces/admin/cantantes/casting/application/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: appId }) });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Error");
      setApps((p) => p.filter((a) => a.id !== appId));
    } finally { setDeletingId(null); setConfirmId(null); }
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
        const urlRes = await fetch(`/api/voces/admin/cantantes/casting/upload-url?ext=${ext}&shareId=${encodeURIComponent(String(id || ""))}`);
        const urlData = await urlRes.json();
        if (!urlData?.ok) throw new Error("Error iniciando subida");
        await fetch(urlData.signedUrl, { method: "PUT", headers: { "Content-Type": addAudioFile.type || "audio/mpeg" }, body: addAudioFile });
        audioUrl = urlData.publicUrl;
      }
      const r = await fetch("/api/voces/admin/cantantes/casting/application/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shareId: id, ...addForm, audioUrl }) });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Error");
      setApps((p) => [j.application, ...p]);
      setShowAddModal(false);
      setAddForm({ firstName: "", lastName: "", phone: "", email: "", country: "", gender: "", homeStudio: "no", onlineSessions: "no" });
      setAddAudioFile(null); setAddAudioLink("");
      setToast("Postulación agregada"); setTimeout(() => setToast(null), 3000);
    } catch (e: any) { setAddError(e?.message || "Error"); }
    finally { setAddSubmitting(false); }
  }

  function copyEmails() {
    const emails = apps.filter((a) => a.email && !a.selected).map((a) => a.email).join(", ");
    if (!emails) { setToast("No hay emails"); setTimeout(() => setToast(null), 2000); return; }
    navigator.clipboard.writeText(emails).then(() => { setToast("Emails copiados"); setTimeout(() => setToast(null), 2500); });
  }

  if (authLoading || !isAdmin) return <main className="p-6">Cargando…</main>;

  return (
    <>
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <a href="/voces/admin/cantantes/casting/results" className="text-[12px] hover:opacity-80" style={{ color: "var(--color-text-muted)" }}>← Resultados</a>
            </div>
            <h1 className="text-[20px] font-[500]" style={{ color: "var(--color-text-primary)" }}>{casting?.title || "Detalle de casting"}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowAddModal(true)} className="ds-btn-secondary text-[12px] py-1.5 px-3">+ Agregar</button>
            <button onClick={copyEmails} className="ds-btn-secondary text-[12px] py-1.5 px-3">Copiar emails</button>
            <button
              disabled={downloading}
              onClick={async () => {
                setDownloading(true);
                try {
                  const res = await fetch(`/api/voces/admin/cantantes/casting/results/${id}/download`);
                  if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j?.error || `Error ${res.status}`); }
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `SIVAR CANTANTES ${casting?.title || id}.zip`; a.click();
                  URL.revokeObjectURL(url);
                } catch (e: any) {
                  setToast(`Error: ${e?.message || "No se pudo descargar"}`);
                  setTimeout(() => setToast(null), 4000);
                } finally { setDownloading(false); }
              }}
              className="ds-btn-secondary text-[12px] py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50"
            >
              {downloading ? (
                <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Preparando ZIP…</>
              ) : (
                <><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd"/></svg>Descargar audios</>
              )}
            </button>
            <button onClick={async () => { try { await navigator.clipboard.writeText(`${location.origin}/voces/cr/${id}`); setToast("Link de resultados copiado"); setTimeout(() => setToast(null), 2000); } catch {} }} className="ds-btn-secondary text-[12px] py-1.5 px-3">Compartir resultados</button>
          </div>
        </div>

        {loading ? (
          <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>Cargando…</p>
        ) : error ? (
          <p className="text-[13px]" style={{ color: "var(--color-accent)" }}>{error}</p>
        ) : (
          <section>
            {apps.length === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>Sin postulaciones aún.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {apps.map((a) => (
                  <article key={a.id} className={`relative rounded-[14px] p-4 transition-colors ${a.selected ? "ring-1 ring-emerald-400/60" : ""}`}
                    style={{ background: a.selected ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.03)", border: `0.5px solid ${a.selected ? "rgba(74,222,128,0.30)" : "var(--color-border-default)"}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-[500] text-[14px]" style={{ color: "var(--color-text-primary)" }}>{a.firstName} {a.lastName}</span>
                          {a.selected && <span className="inline-flex items-center gap-1 text-[10px] font-[600] rounded-full px-2 py-0.5" style={{ background: "rgba(74,222,128,0.10)", color: "#4ade80" }}>✓ Elegido</span>}
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{new Date(a.createdAt).toLocaleString()}</div>
                      </div>
                      <span className={`text-[11px] rounded-full px-2 py-0.5 ${isUploaded(a.audioUrl) ? "bg-emerald-900/40 text-emerald-400" : isExternal(a.audioUrl) ? "bg-blue-900/40 text-blue-300" : "text-gray-500"}`}>
                        {isUploaded(a.audioUrl) ? "Audio" : isExternal(a.audioUrl) ? "Link" : "Sin audio"}
                      </span>
                    </div>

                    <div className="mt-2 text-[12px] flex flex-wrap gap-x-4 gap-y-1" style={{ color: "var(--color-text-secondary)" }}>
                      {a.email && <span>Email: <a href={`mailto:${a.email}`} className="underline">{a.email}</a></span>}
                      {a.phone && <span>Tel: {a.phone}</span>}
                      {a.country && <span>País: {a.country}</span>}
                      {a.gender && <span>Género: {a.gender === "Female" ? "Femenino" : "Masculino"}</span>}
                    </div>

                    {/* Audio */}
                    <div className="mt-3">
                      {isUploaded(a.audioUrl) ? (
                        <div className="flex items-center gap-2">
                          <AudioPlayer src={a.audioUrl} ariaLabel={`Audio de ${a.firstName}`} />
                          <a
                            href={a.audioUrl} download target="_blank" rel="noopener noreferrer"
                            title="Descargar audio"
                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                            style={{ border: "0.5px solid var(--color-border-default)", color: "var(--color-text-muted)" }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                              <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd"/>
                            </svg>
                          </a>
                        </div>
                      ) : isExternal(a.audioUrl) ? (
                        <div className="flex flex-col gap-2">
                          <a href={a.audioUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] underline break-all" style={{ color: "#644cc8" }}>{a.audioUrl}</a>
                          <button onClick={() => onImportAudio(a.id, a.audioUrl)} disabled={importingId === a.id} className="self-start text-[11px] py-1 px-3 rounded-lg border transition-colors disabled:opacity-50" style={{ borderColor: "rgba(100,76,200,0.30)", color: "#644cc8" }}>
                            {importingId === a.id ? "Importando…" : "Importar a Supabase"}
                          </button>
                        </div>
                      ) : (
                        <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>Sin audio</p>
                      )}
                    </div>

                    {/* Reemplazar audio */}
                    <div className="mt-2">
                      <input id={`cc-replace-${a.id}`} type="file" accept="audio/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { onReplaceAudio(a.id, a.shareId || String(id || ""), file); e.target.value = ""; } }} />
                      <button onClick={() => document.getElementById(`cc-replace-${a.id}`)?.click()} disabled={uploadingId === a.id} className="text-[11px] py-1 px-2.5 rounded-lg border disabled:opacity-50 transition-colors" style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-muted)" }}>
                        {uploadingId === a.id ? "Subiendo…" : a.audioUrl ? "Reemplazar audio" : "Subir audio"}
                      </button>
                    </div>

                    {/* Seleccionar */}
                    <div className="mt-3">
                      <button onClick={() => onToggleSelected(a)} disabled={selectingId === a.id}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-[500] transition-colors disabled:opacity-50 ${a.selected ? "border-emerald-400/60 bg-emerald-900/20 text-emerald-400" : "border-white/10 text-white/50 hover:border-emerald-400/40 hover:text-emerald-400"}`}>
                        {selectingId === a.id ? "Guardando…" : a.selected ? "✓ Cantante elegido" : "Marcar como elegido"}
                      </button>
                    </div>

                    {/* Rating + notas */}
                    <div className="mt-3 flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setRating((p) => ({ ...p, [a.id]: n }))} className={`text-sm ${rating[a.id] >= n ? "text-yellow-400" : "text-white/20"}`}>★</button>
                      ))}
                      <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{rating[a.id] ? `${rating[a.id]}/5` : ""}</span>
                    </div>
                    <textarea value={notes[a.id] || ""} onChange={(e) => setNotes((p) => ({ ...p, [a.id]: e.target.value }))} placeholder="Notas internas…" rows={2}
                      className="mt-2 w-full rounded-lg px-3 py-2 text-[12px] resize-none focus:outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-secondary)" }} />

                    {/* Botón eliminar */}
                    <button className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-colors" style={{ color: confirmId === a.id ? "var(--color-accent)" : "var(--color-text-muted)" }}
                      onClick={(e) => { e.stopPropagation(); setConfirmId((p) => p === a.id ? null : a.id); }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5zM8 12.75a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>
                    </button>
                    {confirmId === a.id && (
                      <div className="absolute top-10 right-2 z-10 rounded-[12px] p-3 w-52" style={{ background: "rgba(14,14,16,0.98)", border: "0.5px solid var(--color-border-default)" }} onClick={(e) => e.stopPropagation()}>
                        <div className="text-[13px] font-[500] mb-1" style={{ color: "var(--color-text-primary)" }}>Eliminar esta postulación</div>
                        <p className="text-[11px] mb-3" style={{ color: "var(--color-text-muted)" }}>Esta acción no se puede deshacer.</p>
                        <div className="flex items-center justify-end gap-2">
                          <button className="ds-btn-secondary text-[11px] py-1 px-2.5" onClick={() => setConfirmId(null)}>Cancelar</button>
                          <button className="text-[11px] py-1 px-2.5 rounded-[6px]" style={{ background: "rgba(232,76,43,0.12)", border: "0.5px solid rgba(232,76,43,0.30)", color: "var(--color-accent)" }} onClick={() => onDelete(a.id)} disabled={deletingId === a.id}>{deletingId === a.id ? "Eliminando…" : "Eliminar"}</button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>

    {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-3 py-2 rounded-md shadow-lg z-[120]">{toast}</div>}

    {/* Modal agregar postulación */}
    {showAddModal && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative rounded-[16px] w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl" style={{ background: "rgba(14,14,16,0.99)", border: "0.5px solid var(--color-border-default)" }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[14px] font-[500]" style={{ color: "var(--color-text-primary)" }}>Agregar postulación manual</h2>
            <button onClick={() => setShowAddModal(false)} style={{ color: "var(--color-text-muted)" }}>✕</button>
          </div>
          {addError && <p className="mb-4 text-[12px] px-3 py-2 rounded-lg" style={{ color: "var(--color-accent)", background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.20)" }}>{addError}</p>}
          <form onSubmit={onAddApplication} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[11px] font-[600] uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Nombre *</label><input value={addForm.firstName} onChange={(e) => setAddForm((p) => ({ ...p, firstName: e.target.value }))} className="ds-input" /></div>
              <div><label className="block text-[11px] font-[600] uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Apellido *</label><input value={addForm.lastName} onChange={(e) => setAddForm((p) => ({ ...p, lastName: e.target.value }))} className="ds-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[11px] font-[600] uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Email</label><input type="email" value={addForm.email} onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))} className="ds-input" /></div>
              <div><label className="block text-[11px] font-[600] uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Teléfono</label><input value={addForm.phone} onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))} className="ds-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[11px] font-[600] uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>País</label><input value={addForm.country} onChange={(e) => setAddForm((p) => ({ ...p, country: e.target.value }))} className="ds-input" /></div>
              <div><label className="block text-[11px] font-[600] uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Género</label>
                <select value={addForm.gender} onChange={(e) => setAddForm((p) => ({ ...p, gender: e.target.value }))} className="ds-input [color-scheme:dark]">
                  <option value="">—</option><option value="Male">Masculino</option><option value="Female">Femenino</option>
                </select>
              </div>
            </div>
            <div className="rounded-[10px] p-3" style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid var(--color-border-default)" }}>
              <div className="text-[11px] font-[600] uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>Audio (opcional)</div>
              <input id="cc-add-audio" type="file" accept="audio/*" className="hidden" onChange={(e) => { setAddAudioFile(e.target.files?.[0] || null); if (e.target.files?.[0]) setAddAudioLink(""); }} />
              <div className="flex items-center gap-3 mb-3">
                <button type="button" onClick={() => document.getElementById("cc-add-audio")?.click()} className="ds-btn-secondary text-[11px] py-1 px-2.5">Seleccionar archivo</button>
                <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{addAudioFile?.name || "Ningún archivo"}</span>
              </div>
              <input type="url" value={addAudioLink} onChange={(e) => { setAddAudioLink(e.target.value); if (e.target.value) setAddAudioFile(null); }} placeholder="o pegar link…" className="ds-input" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddModal(false)} className="ds-btn-secondary text-[12px] py-1.5 px-4">Cancelar</button>
              <button type="submit" disabled={addSubmitting} className="ds-btn-primary text-[12px] py-1.5 px-4">{addSubmitting ? "Guardando…" : "Agregar"}</button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
