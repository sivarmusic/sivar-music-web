"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";
import CastingBusinessFields from "@/app/voces/components/admin/CastingBusinessFields";

// Ported from voces-bds's app/admin/cantantes/casting/page.tsx.
//  - Auth: /api/auth/me -> useAuth().
//  - API routes: /api/admin/cantantes/casting/* -> /api/voces/admin/cantantes/casting/*,
//    /api/cantantes -> /api/voces/cantantes,
//    /api/admin/upload-url -> /api/voces/admin/cantantes/casting/upload-url
//    (see that route's comment for why a dedicated endpoint was used instead
//    of the already-ported app/api/voces/admin/upload-url/route.ts).
//  - Links: /admin/cantantes/casting/... -> /voces/admin/cantantes/casting/...,
//    /cc/[shareId] (public apply page, later batch) -> /voces/cc/[shareId].

type AttachmentDraft = { label: string; url: string; file: File | null; uploading?: boolean };

export default function AdminCantantesCastingPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [script, setScript] = useState<File | null>(null);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("");
  const [status, setStatus] = useState("open");
  const [client, setClient] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [editAttachments, setEditAttachments] = useState<AttachmentDraft[]>([]);

  const [fStyles, setFStyles] = useState<string[]>([]);
  const [fCountry, setFCountry] = useState("");
  const [fGender, setFGender] = useState("");
  const [fVocalRange, setFVocalRange] = useState("");
  const [tmpStyles, setTmpStyles] = useState<string[]>([]);
  const [stylesOpts, setStylesOpts] = useState<string[]>([]);
  const [paisesOpts, setPaisesOpts] = useState<string[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBrief, setEditBrief] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editCurrency, setEditCurrency] = useState("");
  const [editStatus, setEditStatus] = useState("open");
  const [editClient, setEditClient] = useState("");
  const [editMediaType, setEditMediaType] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editScriptUrl, setEditScriptUrl] = useState("");
  const [editRefUrl, setEditRefUrl] = useState("");
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [editScriptFile, setEditScriptFile] = useState<File | null>(null);
  const [editRefFile, setEditRefFile] = useState<File | null>(null);
  const [editStyles, setEditStyles] = useState<string[]>([]);
  const [editTmpStyles, setEditTmpStyles] = useState<string[]>([]);
  const [editCountry, setEditCountry] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editVocalRange, setEditVocalRange] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [videoDirectUrl, setVideoDirectUrl] = useState("");
  const [scriptDirectUrl, setScriptDirectUrl] = useState("");
  const [refDirectUrl, setRefDirectUrl] = useState("");
  const [editVideoDirectUrl, setEditVideoDirectUrl] = useState("");
  const [editScriptDirectUrl, setEditScriptDirectUrl] = useState("");
  const [editRefDirectUrl, setEditRefDirectUrl] = useState("");

  async function uploadFileDirect(file: File, folder: string, fieldKey: string): Promise<string> {
    setUploadingField(fieldKey);
    try {
      const r = await fetch("/api/voces/admin/cantantes/casting/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, folder, mimeType: file.type || "application/octet-stream" }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Error obteniendo URL de subida");
      const res = await fetch(j.signedUrl, {
        method: "PUT", body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!res.ok) throw new Error("Error al subir el archivo");
      return j.publicUrl as string;
    } finally {
      setUploadingField(null);
    }
  }

  function toggleStyle(list: string[], val: string) {
    return list.includes(val) ? list.filter((v) => v !== val) : [...list, val];
  }

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
    if (isAdmin) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/voces/cantantes", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || !j?.ok) return;
        const styles = new Set<string>();
        const paises = new Set<string>();
        for (const c of j.cantantes || []) {
          for (const s of (c.estilo || [])) styles.add(s);
          if (c.pais) paises.add(c.pais);
        }
        setStylesOpts(Array.from(styles).sort());
        setPaisesOpts(Array.from(paises).sort());
      } catch {}
    })();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/voces/admin/cantantes/casting/list", { cache: "no-store" });
      const j = await r.json();
      if (r.ok && j?.ok) setItems(j.castings || []);
    } finally { setLoading(false); }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    try {
      const r = await fetch("/api/voces/admin/cantantes/casting/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const j = await r.json();
      if (!r.ok || !j?.ok) { setToast(j?.error || "Error"); setTimeout(() => setToast(null), 2500); return; }
      await refresh();
      setToast("Casting eliminado"); setTimeout(() => setToast(null), 2000);
    } finally { setDeletingId(null); setConfirmId(null); }
  }

  async function openEditor(id: string) {
    setEditError(null);
    try {
      const r = await fetch(`/api/voces/admin/cantantes/casting/get?id=${id}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Error");
      const c = j.casting || {};
      setEditId(c.id || id);
      setEditTitle(c.title || "");
      setEditBrief(c.brief || "");
      setEditVideoUrl(c.videoUrl || "");
      setEditScriptUrl(c.scriptUrl || "");
      setEditRefUrl(c.referenceUrl || "");
      setEditVideoFile(null); setEditScriptFile(null); setEditRefFile(null);
      setEditDeadline(c.deadline ? new Date(c.deadline).toISOString().slice(0, 16) : "");
      setEditBudget(c.budget != null ? String(c.budget) : "");
      setEditCurrency(c.currency || "");
      setEditStatus(c.status || "open");
      setEditClient(c.client || "");
      setEditMediaType(c.mediaType || "");
      const crit = c.criteria || {};
      setEditStyles(Array.isArray(crit.styles) ? crit.styles : []);
      setEditCountry(crit.country || "");
      setEditGender(crit.gender || "");
      setEditVocalRange(crit.vocalRange || "");
      setEditAttachments(
        Array.isArray(c.attachments)
          ? c.attachments.map((a: any) => ({ label: a.label || "", url: a.url || "", file: null }))
          : []
      );
      setEditOpen(true);
    } catch (e: any) { setToast(e?.message || "Error"); setTimeout(() => setToast(null), 3000); }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setEditSaving(true); setEditError(null);
    try {
      const fd = new FormData();
      fd.append("id", editId);
      fd.append("title", editTitle);
      fd.append("brief", editBrief);
      fd.append("videoUrl", editVideoDirectUrl || editVideoUrl || "");
      fd.append("scriptUrl", editScriptDirectUrl || editScriptUrl || "");
      fd.append("referenceUrl", editRefDirectUrl || editRefUrl || "");
      fd.append("deadline", editDeadline ? new Date(editDeadline).toISOString() : "");
      fd.append("budget", editBudget);
      fd.append("currency", editCurrency);
      fd.append("status", editStatus);
      fd.append("client", editClient);
      fd.append("mediaType", editMediaType);
      if (editStyles.length) fd.append("critStyles", JSON.stringify(editStyles));
      if (editCountry) fd.append("critCountry", editCountry);
      if (editGender) fd.append("critGender", editGender);
      if (editVocalRange) fd.append("critVocalRange", editVocalRange);
      fd.append("attachmentCount", String(editAttachments.length));
      for (let i = 0; i < editAttachments.length; i++) {
        fd.append(`attachment_label_${i}`, editAttachments[i].label);
        if (editAttachments[i].file) fd.append(`attachment_file_${i}`, editAttachments[i].file!);
        else fd.append(`attachment_url_${i}`, editAttachments[i].url);
      }
      const r = await fetch("/api/voces/admin/cantantes/casting/update", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok || !j?.ok) { setEditError(j?.error || "Error"); return; }
      setToast("Casting actualizado"); setTimeout(() => setToast(null), 2500);
      setEditVideoDirectUrl(""); setEditScriptDirectUrl(""); setEditRefDirectUrl("");
      setEditOpen(false); await refresh();
    } catch (e: any) { setEditError(e?.message || "Error"); }
    finally { setEditSaving(false); }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (uploadingField) { setMsg("Espera a que terminen de subir los archivos"); return; }
    setMsg(null); setCreating(true);
    try {
      const fd = new FormData();
      fd.append("title", title); fd.append("brief", brief);
      if (videoDirectUrl) fd.append("videoUrl", videoDirectUrl);
      if (scriptDirectUrl) fd.append("scriptUrl", scriptDirectUrl);
      if (refDirectUrl) fd.append("referenceUrl", refDirectUrl);
      else if (referenceUrl) fd.append("referenceUrl", referenceUrl);
      if (deadline) fd.append("deadline", new Date(deadline).toISOString());
      if (budget) fd.append("budget", budget);
      if (currency) fd.append("currency", currency);
      fd.append("status", status);
      if (client) fd.append("client", client);
      if (mediaType) fd.append("mediaType", mediaType);
      if (fStyles.length) fd.append("critStyles", JSON.stringify(fStyles));
      if (fCountry) fd.append("critCountry", fCountry);
      if (fGender) fd.append("critGender", fGender);
      if (fVocalRange) fd.append("critVocalRange", fVocalRange);
      const readyAttachments = attachments.filter((a) => a.url && !a.uploading);
      fd.append("attachmentCount", String(readyAttachments.length));
      readyAttachments.forEach((att, i) => {
        fd.append(`attachment_label_${i}`, att.label);
        fd.append(`attachment_url_${i}`, att.url);
      });
      const r = await fetch("/api/voces/admin/cantantes/casting/create", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok || !j?.ok) { setMsg(j?.error || "Error"); return; }
      setMsg("Casting creado");
      setTitle(""); setBrief(""); setVideo(null); setScript(null); setReferenceFile(null); setReferenceUrl(""); setDeadline("");
      setVideoDirectUrl(""); setScriptDirectUrl(""); setRefDirectUrl("");
      setFStyles([]); setFCountry(""); setFGender(""); setFVocalRange("");
      setAttachments([]);
      await refresh();
    } catch (e: any) { setMsg(e?.message || "Error"); }
    finally { setCreating(false); }
  }

  const dsLabel = "block text-[11px] font-[500] mb-1.5 uppercase tracking-wide";
  const fileBtn = "ds-btn-secondary text-[11px] py-1 px-2.5 shrink-0";
  const fileName = "text-[11px] truncate max-w-[10rem]";

  if (authLoading || !isAdmin) return <main className="p-6">Cargando…</main>;

  return (
    <>
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-8">
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-[500]" style={{ color: "var(--color-text-primary)" }}>Castings — Cantantes</h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Módulo separado del casting de locutores</p>
        </div>
        <a href="/voces/admin/cantantes/casting/results" className="ds-btn-secondary text-[12px] py-1.5 px-3">Resultados</a>
      </div>

      {/* Formulario crear */}
      <div className="max-w-4xl mx-auto rounded-[14px] p-6 mb-8" style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid var(--color-border-default)" }}>
        <h2 className="text-[15px] font-[500] mb-4" style={{ color: "var(--color-text-primary)" }}>Nuevo casting</h2>
        {msg && <p className="mb-3 text-[13px]" style={{ color: msg === "Casting creado" ? "#4ade80" : "var(--color-accent)" }}>{msg}</p>}
        <form onSubmit={onCreate} className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (opcional)" className="ds-input" />
          <textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Brief / instrucciones" className="ds-input h-28 resize-none" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Video</div>
              <input id="cc-video" type="file" accept="video/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                setVideo(f);
                try { const url = await uploadFileDirect(f, "cantante-videos", "c-video"); setVideoDirectUrl(url); }
                catch (err: any) { setToast(err.message || "Error subiendo video"); setTimeout(() => setToast(null), 3000); }
              }} />
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => document.getElementById("cc-video")?.click()} className={fileBtn} disabled={uploadingField === "c-video"}>
                  {uploadingField === "c-video" ? "Subiendo…" : "Seleccionar video"}
                </button>
                <span className={fileName} style={{ color: "var(--color-text-muted)" }}>
                  {uploadingField === "c-video" ? "⏳ Subiendo…" : video ? `${video.name}${videoDirectUrl ? " ✓" : " ⏳"}` : "Ningún archivo"}
                </span>
              </div>
            </div>
            <div>
              <div className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Letra / Guion</div>
              <input id="cc-script" type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.md,.odt" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                setScript(f);
                try { const url = await uploadFileDirect(f, "cantante-scripts", "c-script"); setScriptDirectUrl(url); }
                catch (err: any) { setToast(err.message || "Error subiendo guion"); setTimeout(() => setToast(null), 3000); }
              }} />
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => document.getElementById("cc-script")?.click()} className={fileBtn} disabled={uploadingField === "c-script"}>
                  {uploadingField === "c-script" ? "Subiendo…" : "Seleccionar guion"}
                </button>
                <span className={fileName} style={{ color: "var(--color-text-muted)" }}>
                  {script ? `${script.name}${scriptDirectUrl ? " ✓" : " ⏳"}` : "Ningún archivo"}
                </span>
              </div>
            </div>
            <div>
              <div className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Referencia</div>
              <input value={referenceUrl} onChange={(e) => setReferenceUrl(e.target.value)} placeholder="https://…" className="ds-input mb-1.5" />
              <input id="cc-ref" type="file" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                setReferenceFile(f);
                try { const url = await uploadFileDirect(f, "cantante-refs", "c-ref"); setRefDirectUrl(url); }
                catch (err: any) { setToast(err.message || "Error subiendo referencia"); setTimeout(() => setToast(null), 3000); }
              }} />
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => document.getElementById("cc-ref")?.click()} className={fileBtn} disabled={uploadingField === "c-ref"}>
                  {uploadingField === "c-ref" ? "Subiendo…" : "Adjuntar archivo"}
                </button>
                <span className={fileName} style={{ color: "var(--color-text-muted)" }}>
                  {referenceFile ? `${referenceFile.name}${refDirectUrl ? " ✓" : " ⏳"}` : "Ningún archivo"}
                </span>
              </div>
            </div>
          </div>

          {/* Archivos adjuntos (múltiples) */}
          <div className="pt-3" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Archivos adjuntos para el cantante</div>
              <button type="button" onClick={() => setAttachments((prev) => [...prev, { label: "", url: "", file: null }])} className="ds-btn-secondary text-[11px] py-0.5 px-2.5">+ Agregar archivo</button>
            </div>
            {attachments.length === 0 && (
              <p className="text-[12px] mb-1" style={{ color: "var(--color-text-muted)" }}>Sin archivos adjuntos. El cantante podrá descargarlos desde el casting.</p>
            )}
            <div className="space-y-2">
              {attachments.map((att, i) => (
                <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-[10px] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid var(--color-border-default)" }}>
                  <input
                    value={att.label}
                    onChange={(e) => setAttachments((prev) => prev.map((a, j) => (j === i ? { ...a, label: e.target.value } : a)))}
                    placeholder="Nombre del archivo (ej: Letra, Pista, Guion…)"
                    className="ds-input flex-1 min-w-0 text-[12px]"
                  />
                  <input id={`att-create-file-${i}`} type="file" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    setAttachments((prev) => prev.map((a, j) => (j === i ? { ...a, file: f, uploading: true } : a)));
                    try {
                      const url = await uploadFileDirect(f, "cantante-refs", `c-att-${i}`);
                      setAttachments((prev) => prev.map((a, j) => (j === i ? { ...a, file: null, url, uploading: false } : a)));
                    } catch (err: any) {
                      setAttachments((prev) => prev.map((a, j) => (j === i ? { ...a, file: null, uploading: false } : a)));
                      setToast(err.message || "Error subiendo archivo"); setTimeout(() => setToast(null), 3000);
                    }
                  }} />
                  {att.uploading ? (
                    <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>⏳ Subiendo…</span>
                  ) : !att.url ? (
                    <>
                      <button type="button" onClick={() => document.getElementById(`att-create-file-${i}`)?.click()} className={fileBtn}>Subir archivo</button>
                      <input
                        value={att.url}
                        onChange={(e) => setAttachments((prev) => prev.map((a, j) => (j === i ? { ...a, url: e.target.value } : a)))}
                        placeholder="o pegar URL…"
                        className="ds-input flex-1 min-w-0 text-[12px]"
                      />
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] max-w-[160px] truncate" style={{ color: "#4ade80" }}>✓ Archivo listo</span>
                      <button type="button" onClick={() => setAttachments((prev) => prev.map((a, j) => (j === i ? { ...a, url: "", file: null } : a)))} className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>✕ Quitar</button>
                    </div>
                  )}
                  <button type="button" onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))} className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-colors" style={{ color: "var(--color-text-muted)" }} title="Eliminar">✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Criterios para cantantes */}
          <div className="pt-3" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
            <div className="text-[12px] font-[500] mb-3 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Perfil de cantante buscado</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>País</label>
                <select value={fCountry} onChange={(e) => setFCountry(e.target.value)} className="ds-input [color-scheme:dark] appearance-none">
                  <option value="">Cualquiera</option>
                  {paisesOpts.map((op) => <option key={op} value={op}>{op}</option>)}
                </select>
              </div>
              <div>
                <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Género</label>
                <select value={fGender} onChange={(e) => setFGender(e.target.value)} className="ds-input [color-scheme:dark] appearance-none">
                  <option value="">Cualquiera</option>
                  <option value="Male">Masculino</option>
                  <option value="Female">Femenino</option>
                </select>
              </div>
              <div>
                <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Rango vocal</label>
                <select value={fVocalRange} onChange={(e) => setFVocalRange(e.target.value)} className="ds-input [color-scheme:dark] appearance-none">
                  <option value="">Cualquiera</option>
                  <option value="Soprano">Soprano</option>
                  <option value="Mezzosoprano">Mezzosoprano</option>
                  <option value="Contralto">Contralto</option>
                  <option value="Tenor">Tenor</option>
                  <option value="Barítono">Barítono</option>
                  <option value="Bajo">Bajo</option>
                </select>
              </div>
            </div>
            {stylesOpts.length > 0 && (
              <div className="mt-3">
                <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Géneros / Estilos</label>
                <details id="cc-estilos-crear" className="relative group">
                  <summary className="ds-pill cursor-pointer list-none" onClick={() => setTmpStyles(fStyles)}>
                    {fStyles.length ? `${fStyles.length} seleccionados` : "Seleccionar estilos"}
                    <svg className="inline-block ml-1 w-3 h-3" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--color-text-muted)" }}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                  </summary>
                  <div className="absolute z-20 mt-1 w-64 rounded-[12px] overflow-hidden shadow-2xl" style={{ background: "rgba(18,18,20,0.98)", border: "0.5px solid var(--color-border-default)" }}>
                    <div className="max-h-56 overflow-auto px-3 py-2 flex flex-col gap-1.5">
                      {stylesOpts.map((op) => (
                        <label key={op} className="flex items-start gap-2 text-[13px] cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>
                          <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ accentColor: "#644cc8" }} checked={tmpStyles.includes(op)} onChange={() => setTmpStyles((p) => toggleStyle(p, op))} />
                          <span>{op}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2 px-3 py-2" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
                      <button type="button" className="ds-btn-secondary text-[11px] py-1 px-2.5" onClick={() => { setTmpStyles([]); setFStyles([]); (document.getElementById("cc-estilos-crear") as HTMLDetailsElement | null)?.removeAttribute("open"); }}>Limpiar</button>
                      <button type="button" className="ds-btn-primary text-[11px] py-1 px-2.5" onClick={() => { setFStyles(tmpStyles); (document.getElementById("cc-estilos-crear") as HTMLDetailsElement | null)?.removeAttribute("open"); }}>Aplicar</button>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </div>

          <div>
            <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Fecha límite (opcional)</label>
            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="ds-input" style={{ colorScheme: "dark" }} />
          </div>
          <CastingBusinessFields
            budget={budget} onBudget={setBudget}
            currency={currency} onCurrency={setCurrency}
            status={status} onStatus={setStatus}
            client={client} onClient={setClient}
            mediaType={mediaType} onMediaType={setMediaType}
          />
          <button type="submit" disabled={creating} className="ds-btn-primary px-5 py-2">{creating ? "Creando…" : "Crear"}</button>
        </form>
      </div>

      {/* Lista de castings */}
      <div className="max-w-5xl mx-auto">
        <h2 className="text-[15px] font-[500] mb-4" style={{ color: "var(--color-text-primary)" }}>Castings creados</h2>
        {loading ? (
          <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>Aún no hay castings de cantantes</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((c) => (
              <li key={c.id} className="relative rounded-[12px] px-4 py-3 cursor-pointer transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid var(--color-border-default)" }}
                onClick={() => { if (confirmId === c.id) { setConfirmId(null); return; } window.location.href = `/voces/cc/${c.shareId}`; }}>
                <div className="text-[14px] font-[500] pr-20" style={{ color: "var(--color-text-primary)" }}>{c.title || "Sin título"}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{new Date(c.createdAt).toLocaleString()}</div>
                <div className="mt-2.5 flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); try { navigator.clipboard.writeText(`${location.origin}/voces/cc/${c.shareId}`); setToast("Copiado"); setTimeout(() => setToast(null), 2000); } catch {} }} className="ds-btn-secondary text-[11px] py-1 px-2.5">Copiar link</button>
                  <a href={`/voces/admin/cantantes/casting/candidates/${c.shareId}`} onClick={(e) => e.stopPropagation()} className="ds-btn-secondary text-[11px] py-1 px-2.5">Candidatos</a>
                </div>
                <button onClick={(e) => { e.stopPropagation(); openEditor(c.id); }} className="absolute top-3 right-10 ds-btn-secondary text-[11px] py-1 px-2.5">Editar</button>
                <button onClick={(e) => { e.stopPropagation(); setConfirmId((p) => (p === c.id ? null : c.id)); }} className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-colors" style={{ color: confirmId === c.id ? "var(--color-accent)" : "var(--color-text-muted)" }} title="Eliminar">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5zM8 12.75a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>
                </button>
                {confirmId === c.id && (
                  <div className="absolute top-10 right-2 z-10 rounded-[12px] p-3 w-56" style={{ background: "rgba(14,14,16,0.98)", border: "0.5px solid var(--color-border-default)" }} onClick={(e) => e.stopPropagation()}>
                    <div className="text-[13px] font-[500] mb-1" style={{ color: "var(--color-text-primary)" }}>Eliminar este casting</div>
                    <p className="text-[11px] mb-3" style={{ color: "var(--color-text-muted)" }}>Esta acción no se puede deshacer.</p>
                    <div className="flex items-center justify-end gap-2">
                      <button className="ds-btn-secondary text-[11px] py-1 px-2.5" onClick={() => setConfirmId(null)}>Cancelar</button>
                      <button className="text-[11px] py-1 px-2.5 rounded-[6px]" style={{ background: "rgba(232,76,43,0.12)", border: "0.5px solid rgba(232,76,43,0.30)", color: deletingId === c.id ? "rgba(232,76,43,0.4)" : "var(--color-accent)" }} onClick={() => onDelete(c.id)} disabled={deletingId === c.id}>{deletingId === c.id ? "Eliminando…" : "Eliminar"}</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>

    {/* Modal editar */}
    {editOpen && (
      <div className="fixed inset-0 z-[200] flex items-start justify-center pt-12 px-4">
        <div className="absolute inset-0 bg-black/60" onClick={() => setEditOpen(false)} />
        <div className="relative w-full max-w-2xl rounded-[14px] overflow-hidden shadow-2xl" style={{ background: "rgba(14,14,16,0.99)", border: "0.5px solid var(--color-border-default)" }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "0.5px solid var(--color-border-default)" }}>
            <div className="text-[14px] font-[500]" style={{ color: "var(--color-text-primary)" }}>Editar casting</div>
            <button onClick={() => setEditOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full" style={{ color: "var(--color-text-muted)" }}>✕</button>
          </div>
          <form onSubmit={submitEdit} className="p-5 space-y-3 max-h-[75vh] overflow-auto">
            {editError && <div className="text-[13px]" style={{ color: "var(--color-accent)" }}>{editError}</div>}
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Título" className="ds-input" />
            <textarea value={editBrief} onChange={(e) => setEditBrief(e.target.value)} placeholder="Brief / instrucciones" className="ds-input h-24 resize-none" />
            <div>
              <label className="block text-[11px] font-[500] mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Fecha límite</label>
              <input type="datetime-local" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} className="ds-input" style={{ colorScheme: "dark" }} />
            </div>
            <CastingBusinessFields
              budget={editBudget} onBudget={setEditBudget}
              currency={editCurrency} onCurrency={setEditCurrency}
              status={editStatus} onStatus={setEditStatus}
              client={editClient} onClient={setEditClient}
              mediaType={editMediaType} onMediaType={setEditMediaType}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
              <div>
                <div className="block text-[11px] font-[500] mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Video</div>
                <input id="ecc-video" type="file" accept="video/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  setEditVideoFile(f);
                  try { const url = await uploadFileDirect(f, "cantante-videos", "e-video"); setEditVideoDirectUrl(url); }
                  catch (err: any) { setEditError(err.message || "Error subiendo video"); }
                }} />
                <div className="flex items-center gap-2 mb-1.5">
                  <button type="button" onClick={() => document.getElementById("ecc-video")?.click()} className={fileBtn} disabled={uploadingField === "e-video"}>
                    {uploadingField === "e-video" ? "Subiendo…" : "Subir video"}
                  </button>
                  <span className={fileName} style={{ color: "var(--color-text-muted)" }}>
                    {uploadingField === "e-video" ? "⏳ Subiendo…"
                      : editVideoFile ? `${editVideoFile.name}${editVideoDirectUrl ? " ✓" : " ⏳"}`
                      : editVideoUrl ? "Actual: URL" : "Ninguno"}
                  </span>
                </div>
                <input value={editVideoDirectUrl || editVideoUrl} onChange={(e) => { setEditVideoUrl(e.target.value); setEditVideoDirectUrl(""); }} placeholder="o pegar URL…" className="ds-input" />
              </div>
              <div>
                <div className="block text-[11px] font-[500] mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Letra / Guion</div>
                <input id="ecc-script" type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.md,.odt" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  setEditScriptFile(f);
                  try { const url = await uploadFileDirect(f, "cantante-scripts", "e-script"); setEditScriptDirectUrl(url); }
                  catch (err: any) { setEditError(err.message || "Error subiendo guion"); }
                }} />
                <div className="flex items-center gap-2 mb-1.5">
                  <button type="button" onClick={() => document.getElementById("ecc-script")?.click()} className={fileBtn} disabled={uploadingField === "e-script"}>
                    {uploadingField === "e-script" ? "Subiendo…" : "Subir guion"}
                  </button>
                  <span className={fileName} style={{ color: "var(--color-text-muted)" }}>
                    {editScriptFile ? `${editScriptFile.name}${editScriptDirectUrl ? " ✓" : " ⏳"}`
                      : editScriptUrl ? "Actual: URL" : "Ninguno"}
                  </span>
                </div>
                <input value={editScriptDirectUrl || editScriptUrl} onChange={(e) => { setEditScriptUrl(e.target.value); setEditScriptDirectUrl(""); }} placeholder="o pegar URL…" className="ds-input" />
              </div>
              <div>
                <div className="block text-[11px] font-[500] mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Referencia</div>
                <input id="ecc-ref" type="file" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  setEditRefFile(f);
                  try { const url = await uploadFileDirect(f, "cantante-refs", "e-ref"); setEditRefDirectUrl(url); }
                  catch (err: any) { setEditError(err.message || "Error subiendo referencia"); }
                }} />
                <div className="flex items-center gap-2 mb-1.5">
                  <button type="button" onClick={() => document.getElementById("ecc-ref")?.click()} className={fileBtn} disabled={uploadingField === "e-ref"}>
                    {uploadingField === "e-ref" ? "Subiendo…" : "Adjuntar archivo"}
                  </button>
                  <span className={fileName} style={{ color: "var(--color-text-muted)" }}>
                    {editRefFile ? `${editRefFile.name}${editRefDirectUrl ? " ✓" : " ⏳"}`
                      : editRefUrl ? "Actual: URL" : "Ninguno"}
                  </span>
                </div>
                <input value={editRefDirectUrl || editRefUrl} onChange={(e) => { setEditRefUrl(e.target.value); setEditRefDirectUrl(""); }} placeholder="o pegar URL…" className="ds-input" />
              </div>
            </div>

            <div className="pt-2" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-[500] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Archivos adjuntos</div>
                <button type="button" onClick={() => setEditAttachments((prev) => [...prev, { label: "", url: "", file: null }])} className="ds-btn-secondary text-[11px] py-0.5 px-2.5">+ Agregar</button>
              </div>
              {editAttachments.length === 0 && (
                <p className="text-[12px] mb-1" style={{ color: "var(--color-text-muted)" }}>Sin archivos. El cantante podrá descargarlos desde el casting.</p>
              )}
              <div className="space-y-2">
                {editAttachments.map((att, i) => (
                  <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-[10px] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid var(--color-border-default)" }}>
                    <input
                      value={att.label}
                      onChange={(e) => setEditAttachments((prev) => prev.map((a, j) => (j === i ? { ...a, label: e.target.value } : a)))}
                      placeholder="Nombre del archivo (ej: Letra, Pista, Guion…)"
                      className="ds-input flex-1 min-w-0 text-[12px]"
                    />
                    <input id={`att-edit-file-${i}`} type="file" className="hidden" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setEditAttachments((prev) => prev.map((a, j) => (j === i ? { ...a, file: f, uploading: true } : a)));
                      try {
                        const url = await uploadFileDirect(f, "cantante-refs", `e-att-${i}`);
                        setEditAttachments((prev) => prev.map((a, j) => (j === i ? { ...a, file: null, url, uploading: false } : a)));
                      } catch (err: any) {
                        setEditAttachments((prev) => prev.map((a, j) => (j === i ? { ...a, file: null, uploading: false } : a)));
                        setEditError(err.message || "Error subiendo archivo");
                      }
                    }} />
                    {att.uploading ? (
                      <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>⏳ Subiendo…</span>
                    ) : att.url ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] max-w-[160px] truncate" style={{ color: "#4ade80" }}>✓ Listo</span>
                        <button type="button" onClick={() => setEditAttachments((prev) => prev.map((a, j) => (j === i ? { ...a, url: "", file: null } : a)))} className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>✕ Quitar</button>
                      </div>
                    ) : (
                      <>
                        <button type="button" onClick={() => document.getElementById(`att-edit-file-${i}`)?.click()} className={fileBtn}>Subir archivo</button>
                        <input
                          value={att.url}
                          onChange={(e) => setEditAttachments((prev) => prev.map((a, j) => (j === i ? { ...a, url: e.target.value } : a)))}
                          placeholder="o pegar URL…"
                          className="ds-input flex-1 min-w-0 text-[12px]"
                        />
                      </>
                    )}
                    <button type="button" onClick={() => setEditAttachments((prev) => prev.filter((_, j) => j !== i))} className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full" style={{ color: "var(--color-text-muted)" }} title="Eliminar fila">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
              <div className="text-[12px] font-[500] mb-3 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Perfil buscado</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-[500] mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>País</label>
                  <select value={editCountry} onChange={(e) => setEditCountry(e.target.value)} className="ds-input [color-scheme:dark] appearance-none">
                    <option value="">Cualquiera</option>
                    {paisesOpts.map((op) => <option key={op} value={op}>{op}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-[500] mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Género</label>
                  <select value={editGender} onChange={(e) => setEditGender(e.target.value)} className="ds-input [color-scheme:dark] appearance-none">
                    <option value="">Cualquiera</option>
                    <option value="Male">Masculino</option>
                    <option value="Female">Femenino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-[500] mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Rango vocal</label>
                  <select value={editVocalRange} onChange={(e) => setEditVocalRange(e.target.value)} className="ds-input [color-scheme:dark] appearance-none">
                    <option value="">Cualquiera</option>
                    <option value="Soprano">Soprano</option>
                    <option value="Mezzosoprano">Mezzosoprano</option>
                    <option value="Contralto">Contralto</option>
                    <option value="Tenor">Tenor</option>
                    <option value="Barítono">Barítono</option>
                    <option value="Bajo">Bajo</option>
                  </select>
                </div>
              </div>
              {stylesOpts.length > 0 && (
                <div className="mt-3">
                  <label className="block text-[11px] font-[500] mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Géneros / Estilos</label>
                  <details id="ecc-estilos-editar" className="relative group">
                    <summary className="ds-pill cursor-pointer list-none" onClick={() => setEditTmpStyles(editStyles)}>
                      {editStyles.length ? `${editStyles.length} seleccionados` : "Seleccionar estilos"}
                      <svg className="inline-block ml-1 w-3 h-3" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--color-text-muted)" }}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                    </summary>
                    <div className="absolute z-20 mt-1 w-64 rounded-[12px] overflow-hidden shadow-2xl" style={{ background: "rgba(18,18,20,0.98)", border: "0.5px solid var(--color-border-default)" }}>
                      <div className="max-h-48 overflow-auto px-3 py-2 flex flex-col gap-1.5">
                        {stylesOpts.map((op) => (
                          <label key={op} className="flex items-start gap-2 text-[13px] cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>
                            <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ accentColor: "#644cc8" }} checked={editTmpStyles.includes(op)} onChange={() => setEditTmpStyles((p) => toggleStyle(p, op))} />
                            <span>{op}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2 px-3 py-2" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
                        <button type="button" className="ds-btn-secondary text-[11px] py-1 px-2.5" onClick={() => { setEditTmpStyles([]); setEditStyles([]); (document.getElementById("ecc-estilos-editar") as HTMLDetailsElement | null)?.removeAttribute("open"); }}>Limpiar</button>
                        <button type="button" className="ds-btn-primary text-[11px] py-1 px-2.5" onClick={() => { setEditStyles(editTmpStyles); (document.getElementById("ecc-estilos-editar") as HTMLDetailsElement | null)?.removeAttribute("open"); }}>Aplicar</button>
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={() => setEditOpen(false)} className="ds-btn-secondary text-[12px] py-1.5 px-3">Cancelar</button>
              <button type="submit" disabled={editSaving} className="ds-btn-primary text-[12px] py-1.5 px-3">{editSaving ? "Guardando…" : "Guardar"}</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-3 py-2 rounded-md shadow-lg z-[120]">{toast}</div>}
    </>
  );
}
