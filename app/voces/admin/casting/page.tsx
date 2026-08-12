"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";
import { toArray } from "@/lib/voces-arrays";
import CastingBusinessFields from "@/app/voces/components/admin/CastingBusinessFields";

// Ported from voces-bds's app/admin/casting/page.tsx.
//  - Auth: /api/auth/me -> useAuth(), self-gated client-side, redirects to
//    /voces/login when not admin (instead of inline "Solo admins" text).
//  - API routes: /api/admin/casting/* -> /api/voces/admin/casting/*,
//    /api/locutores -> /api/voces/locutores.
//  - Links: /admin/casting/... -> /voces/admin/casting/..., /c/[shareId]
//    (public apply page) -> /voces/c/[shareId] (that page itself belongs to
//    a later batch — link kept for when it lands).

export default function AdminCastingPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [script, setScript] = useState<File | null>(null);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [deadline, setDeadline] = useState("");
  // Campos de negocio (reportes)
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

  // Editar casting (modal)
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBrief, setEditBrief] = useState("");
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [editScriptFile, setEditScriptFile] = useState<File | null>(null);
  const [editRefFile, setEditRefFile] = useState<File | null>(null);
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editScriptUrl, setEditScriptUrl] = useState("");
  const [editRefUrl, setEditRefUrl] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editCurrency, setEditCurrency] = useState("");
  const [editStatus, setEditStatus] = useState("open");
  const [editClient, setEditClient] = useState("");
  const [editMediaType, setEditMediaType] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // Opciones derivadas de locutores (filtros)
  const [idiomasOpts, setIdiomasOpts] = useState<string[]>([]);
  const [acentosPorIdioma, setAcentosPorIdioma] = useState<Record<string, string[]>>({});
  const [generosOpts, setGenerosOpts] = useState<string[]>([]);
  const [estilosOpts, setEstilosOpts] = useState<string[]>([]);
  const [edadesOpts, setEdadesOpts] = useState<string[]>([]);

  // Selección para creación
  const [fIdioma, setFIdioma] = useState("");
  const [fAcento, setFAcento] = useState("");
  const [fGenero, setFGenero] = useState("");
  const [fEstilos, setFEstilos] = useState<string[]>([]);
  const [tmpEstilos, setTmpEstilos] = useState<string[]>([]);
  const [fEdades, setFEdades] = useState<string[]>([]);
  const [tmpEdades, setTmpEdades] = useState<string[]>([]);

  // Selección para edición
  const [editLang, setEditLang] = useState("");
  const [editAccent, setEditAccent] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editStyles, setEditStyles] = useState<string[]>([]);
  const [editTmpStyles, setEditTmpStyles] = useState<string[]>([]);
  const [editAges, setEditAges] = useState<string[]>([]);
  const [editTmpAges, setEditTmpAges] = useState<string[]>([]);

  type Pair = { lang: string; accent: string };
  function splitList(value: string) {
    if (!value) return [] as string[];
    return toArray(value).map((s) => s.trim()).filter(Boolean);
  }
  function toggleInList(list: string[], value: string) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }
  function parseLangAccentsSimple(value: string): Pair[] {
    if (!value) return [];
    const chunks = toArray(value).map((s) => s.trim()).filter(Boolean);
    const res: Pair[] = [];
    for (const ch of chunks) {
      const m = ch.match(/^\s*(.+?)\s*-\s*(.+)\s*$/);
      if (m) {
        const lang = m[1].trim();
        const accent = m[2].trim();
        res.push({ lang: lang.charAt(0).toUpperCase() + lang.slice(1), accent });
      } else {
        const lang = ch.trim();
        if (lang) res.push({ lang: lang.charAt(0).toUpperCase() + lang.slice(1), accent: "" });
      }
    }
    return res;
  }

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/voces/login");
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (!confirmId) return;
    const onDocClick = () => setConfirmId(null);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [confirmId]);

  useEffect(() => {
    if (isAdmin) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Cargar opciones de filtros desde /api/voces/locutores
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/voces/locutores", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || !j?.ok) return;
        const locs = j.locutores || [];
        const langs = new Set<string>();
        const accentsBy: Record<string, Set<string>> = {};
        const gens = new Set<string>();
        const styles = new Set<string>();
        const ages = new Set<string>();
        for (const l of locs) {
          if (l.genero) gens.add(l.genero);
          for (const s of splitList(l.estilo || "")) styles.add(s);
          for (const a of splitList(l.edad || "")) ages.add(a);
          const pairs = parseLangAccentsSimple(String(l.idioma || ""));
          for (const p of pairs) {
            const L = (p.lang || "").trim();
            if (!L) continue;
            langs.add(L);
            if (!accentsBy[L]) accentsBy[L] = new Set<string>();
            if ((p.accent || "").trim()) accentsBy[L].add(p.accent);
          }
        }
        setIdiomasOpts(Array.from(langs));
        const obj: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(accentsBy)) obj[k] = Array.from(v);
        setAcentosPorIdioma(obj);
        setGenerosOpts(Array.from(gens));
        setEstilosOpts(Array.from(styles));
        setEdadesOpts(Array.from(ages));
      } catch {}
    })();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/voces/admin/casting/list", { cache: "no-store" });
      const j = await r.json();
      if (r.ok && j?.ok) setItems(j.castings || []);
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    try {
      const r = await fetch("/api/voces/admin/casting/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        setToast(j?.error || "Error eliminando");
        setTimeout(() => setToast(null), 2500);
        return;
      }
      await refresh();
      setToast("Casting eliminado");
      setTimeout(() => setToast(null), 2000);
    } catch (e: any) {
      setToast(e?.message || "Error");
      setTimeout(() => setToast(null), 2500);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  async function openEditor(id: string) {
    setEditError(null);
    try {
      const r = await fetch(`/api/voces/admin/casting/get?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo cargar");
      const c = j.casting || {};
      setEditId(c.id || id);
      setEditTitle(c.title || "");
      setEditBrief(c.brief || "");
      setEditVideoUrl(c.videoUrl || "");
      setEditScriptUrl(c.scriptUrl || "");
      setEditRefUrl(c.referenceUrl || "");
      setEditVideoFile(null);
      setEditScriptFile(null);
      setEditRefFile(null);
      setEditDeadline(c.deadline ? new Date(c.deadline).toISOString().slice(0, 16) : "");
      setEditBudget(c.budget != null ? String(c.budget) : "");
      setEditCurrency(c.currency || "");
      setEditStatus(c.status || "open");
      setEditClient(c.client || "");
      setEditMediaType(c.mediaType || "");
      const crit = c.criteria || {};
      setEditLang(crit.language || "");
      setEditAccent(crit.accent || "");
      setEditGender(crit.gender || "");
      setEditStyles(Array.isArray(crit.styles) ? crit.styles : []);
      setEditAges(Array.isArray(crit.ages) ? crit.ages : []);
      setEditOpen(true);
    } catch (e: any) {
      setToast(e?.message || "Error abriendo editor");
      setTimeout(() => setToast(null), 3000);
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const fd = new FormData();
      fd.append("id", editId);
      fd.append("title", editTitle);
      fd.append("brief", editBrief);
      if (editVideoFile) fd.append("video", editVideoFile);
      if (editScriptFile) fd.append("script", editScriptFile);
      if (editRefFile) fd.append("reference", editRefFile);
      if (editVideoUrl && !editVideoFile) fd.append("videoUrl", editVideoUrl);
      if (editScriptUrl && !editScriptFile) fd.append("scriptUrl", editScriptUrl);
      if (editRefUrl && !editRefFile) fd.append("referenceUrl", editRefUrl);
      fd.append("deadline", editDeadline ? new Date(editDeadline).toISOString() : "");
      fd.append("budget", editBudget);
      fd.append("currency", editCurrency);
      fd.append("status", editStatus);
      fd.append("client", editClient);
      fd.append("mediaType", editMediaType);
      if (editLang) fd.append("critLanguage", editLang);
      if (editAccent) fd.append("critAccent", editAccent);
      if (editGender) fd.append("critGender", editGender);
      if (editStyles?.length) fd.append("critStyles", JSON.stringify(editStyles));
      if (editAges?.length) fd.append("critAges", JSON.stringify(editAges));
      const r = await fetch("/api/voces/admin/casting/update", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        setEditError(j?.error || "Error guardando");
        return;
      }
      setToast("Casting actualizado");
      setTimeout(() => setToast(null), 2500);
      setEditOpen(false);
      setEditSaving(false);
      await refresh();
    } catch (e: any) {
      setEditError(e?.message || "Error");
    } finally {
      setEditSaving(false);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("brief", brief);
      if (video) fd.append("video", video);
      if (script) fd.append("script", script);
      if (referenceFile) fd.append("reference", referenceFile);
      if (referenceUrl) fd.append("referenceUrl", referenceUrl);
      if (deadline) fd.append("deadline", new Date(deadline).toISOString());
      if (budget) fd.append("budget", budget);
      if (currency) fd.append("currency", currency);
      fd.append("status", status);
      if (client) fd.append("client", client);
      if (mediaType) fd.append("mediaType", mediaType);
      if (fIdioma) fd.append("critLanguage", fIdioma);
      if (fAcento) fd.append("critAccent", fAcento);
      if (fGenero) fd.append("critGender", fGenero);
      if (fEstilos.length) fd.append("critStyles", JSON.stringify(fEstilos));
      if (fEdades.length) fd.append("critAges", JSON.stringify(fEdades));
      const r = await fetch("/api/voces/admin/casting/create", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        setMsg(j?.error || "Error creando casting");
        return;
      }
      setMsg("Casting creado");
      setTitle("");
      setBrief("");
      setVideo(null);
      setScript(null);
      setReferenceFile(null);
      setReferenceUrl("");
      setDeadline("");
      setFIdioma("");
      setFAcento("");
      setFGenero("");
      setFEstilos([]);
      setFEdades([]);
      await refresh();
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setCreating(false);
    }
  }

  const dsSelect = "ds-input [color-scheme:dark] appearance-none";
  const dsLabel = "block text-[11px] font-[500] mb-1.5 uppercase tracking-wide";
  const fileBtn = "ds-btn-secondary text-[11px] py-1 px-2.5 shrink-0";
  const fileName = "text-[11px] truncate max-w-[10rem]";

  if (authLoading || !isAdmin) return <main className="p-6">Cargando…</main>;

  return (
    <>
      <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between mb-6">
          <h1 className="text-[24px] font-[500]" style={{ color: "var(--color-text-primary)" }}>Castings</h1>
          <a href="/voces/admin/casting/results" className="ds-btn-secondary text-[12px] py-1.5 px-3">Resultados de castings</a>
        </div>

        {/* Create form */}
        <div className="max-w-4xl mx-auto rounded-[14px] p-6 mb-8" style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid var(--color-border-default)" }}>
          <h2 className="text-[15px] font-[500] mb-4" style={{ color: "var(--color-text-primary)" }}>Nuevo casting</h2>
          {msg && <p className="mb-3 text-[13px]" style={{ color: msg === "Casting creado" ? "#4ade80" : "var(--color-accent)" }}>{msg}</p>}
          <form onSubmit={onCreate} className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (opcional)" className="ds-input" />
            <textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Brief / instrucciones" className="ds-input h-28 resize-none" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Video</div>
                <input id="cast-video" type="file" accept="video/*" onChange={(e) => setVideo(e.target.files?.[0] || null)} className="hidden" />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => document.getElementById("cast-video")?.click()} className={fileBtn}>Seleccionar video</button>
                  <span className={fileName} style={{ color: "var(--color-text-muted)" }}>{video?.name || "Ningún archivo"}</span>
                </div>
              </div>
              <div>
                <div className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Guion (PDF/DOC/TXT)</div>
                <input id="cast-script" type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.md,.odt" onChange={(e) => setScript(e.target.files?.[0] || null)} className="hidden" />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => document.getElementById("cast-script")?.click()} className={fileBtn}>Seleccionar guion</button>
                  <span className={fileName} style={{ color: "var(--color-text-muted)" }}>{script?.name || "Ningún archivo"}</span>
                </div>
              </div>
              <div>
                <div className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Referencia (link, audio o video)</div>
                <input value={referenceUrl} onChange={(e) => setReferenceUrl(e.target.value)} placeholder="https://… (opcional)" className="ds-input mb-1.5" />
                <input id="cast-ref" type="file" onChange={(e) => setReferenceFile(e.target.files?.[0] || null)} className="hidden" />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => document.getElementById("cast-ref")?.click()} className={fileBtn}>Adjuntar archivo</button>
                  <span className={fileName} style={{ color: "var(--color-text-muted)" }}>{referenceFile?.name || "Ningún archivo"}</span>
                </div>
              </div>
            </div>

            <div className="pt-3" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
              <div className="text-[12px] font-[500] mb-3 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Características de la voz</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Idioma</label>
                  <select value={fIdioma} onChange={(e) => { setFIdioma(e.target.value); setFAcento(""); }} className={dsSelect}>
                    <option value="">Cualquiera</option>
                    {idiomasOpts.map((op) => (<option key={op} value={op}>{op}</option>))}
                  </select>
                </div>
                <div>
                  <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Acento</label>
                  <select value={fAcento} onChange={(e) => setFAcento(e.target.value)} className={dsSelect} disabled={!fIdioma}>
                    <option value="">Cualquiera</option>
                    {(fIdioma ? (acentosPorIdioma[fIdioma] || []) : []).map((op) => (<option key={op} value={op}>{op}</option>))}
                  </select>
                </div>
                <div>
                  <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Género</label>
                  <select value={fGenero} onChange={(e) => setFGenero(e.target.value)} className={dsSelect}>
                    <option value="">Cualquiera</option>
                    {generosOpts.map((op) => (<option key={op} value={op}>{op}</option>))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Estilos</label>
                  <details id="estilos-crear" className="relative group">
                    <summary className="ds-pill cursor-pointer list-none" style={{ listStyle: "none" }} onClick={() => setTmpEstilos(fEstilos)}>
                      <span>{fEstilos.length ? `${fEstilos.length} seleccionados` : "Seleccionar estilos"}</span>
                      <svg className="inline-block ml-1 w-3 h-3" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--color-text-muted)" }}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                    </summary>
                    <div className="absolute z-20 mt-1 w-64 rounded-[12px] overflow-hidden shadow-2xl" style={{ background: "rgba(18,18,20,0.98)", border: "0.5px solid var(--color-border-default)" }}>
                      <div className="max-h-56 overflow-auto px-3 py-2 flex flex-col gap-1.5">
                        {estilosOpts.map((op) => (
                          <label key={op} className="flex items-start gap-2 text-[13px] cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>
                            <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ accentColor: "var(--color-accent)" }} checked={tmpEstilos.includes(op)} onChange={() => setTmpEstilos((prev) => toggleInList(prev, op))} />
                            <span className="flex-1 break-words leading-tight">{op}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2 px-3 py-2" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
                        <button type="button" className="ds-btn-secondary text-[11px] py-1 px-2.5" onClick={() => { setTmpEstilos([]); setFEstilos([]); (document.getElementById("estilos-crear") as HTMLDetailsElement | null)?.removeAttribute("open"); }}>Limpiar</button>
                        <button type="button" className="ds-btn-primary text-[11px] py-1 px-2.5" onClick={() => { setFEstilos(tmpEstilos); (document.getElementById("estilos-crear") as HTMLDetailsElement | null)?.removeAttribute("open"); }}>Aplicar</button>
                      </div>
                    </div>
                  </details>
                </div>
                <div>
                  <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Rango de edad</label>
                  <details id="edades-crear" className="relative group">
                    <summary className="ds-pill cursor-pointer list-none" style={{ listStyle: "none" }} onClick={() => setTmpEdades(fEdades)}>
                      <span>{fEdades.length ? `${fEdades.length} seleccionados` : "Seleccionar edades"}</span>
                      <svg className="inline-block ml-1 w-3 h-3" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--color-text-muted)" }}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                    </summary>
                    <div className="absolute z-20 mt-1 w-64 rounded-[12px] overflow-hidden shadow-2xl" style={{ background: "rgba(18,18,20,0.98)", border: "0.5px solid var(--color-border-default)" }}>
                      <div className="max-h-56 overflow-auto px-3 py-2 flex flex-col gap-1.5">
                        {edadesOpts.map((op) => (
                          <label key={op} className="flex items-start gap-2 text-[13px] cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>
                            <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ accentColor: "var(--color-accent)" }} checked={tmpEdades.includes(op)} onChange={() => setTmpEdades((prev) => toggleInList(prev, op))} />
                            <span className="flex-1 break-words leading-tight">{op}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2 px-3 py-2" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
                        <button type="button" className="ds-btn-secondary text-[11px] py-1 px-2.5" onClick={() => { setTmpEdades([]); setFEdades([]); (document.getElementById("edades-crear") as HTMLDetailsElement | null)?.removeAttribute("open"); }}>Limpiar</button>
                        <button type="button" className="ds-btn-primary text-[11px] py-1 px-2.5" onClick={() => { setFEdades(tmpEdades); (document.getElementById("edades-crear") as HTMLDetailsElement | null)?.removeAttribute("open"); }}>Aplicar</button>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
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

        {/* Created castings */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[15px] font-[500] mb-4" style={{ color: "var(--color-text-primary)" }}>Castings creados</h2>
          {loading ? (
            <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>Cargando…</p>
          ) : items.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>Aún no hay castings</p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((c) => (
                <li
                  key={c.id}
                  className="relative rounded-[12px] px-4 py-3 cursor-pointer transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid var(--color-border-default)" }}
                  onClick={(e) => {
                    if (confirmId === c.id) { e.preventDefault(); e.stopPropagation(); setConfirmId(null); return; }
                    window.location.href = `/voces/c/${c.shareId}`;
                  }}
                >
                  <div className="text-[14px] font-[500] pr-20" style={{ color: "var(--color-text-primary)" }}>{c.title || "Sin título"}</div>
                  <div className="text-[11px] mt-0.5 pr-20" style={{ color: "var(--color-text-muted)" }}>{new Date(c.createdAt).toLocaleString()}</div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={async (e) => { e.stopPropagation(); try { await navigator.clipboard.writeText(`${location.origin}/voces/c/${c.shareId}`); setToast("Copiado al portapapeles"); setTimeout(() => setToast(null), 2500); } catch {} }}
                      className="ds-btn-secondary text-[11px] py-1 px-2.5"
                    >Copiar link</button>
                    <a href={`/voces/admin/casting/candidates/${c.shareId}`} onClick={(e) => e.stopPropagation()} className="ds-btn-secondary text-[11px] py-1 px-2.5">Posibles candidatos</a>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); openEditor(c.id); }} className="absolute top-3 right-10 ds-btn-secondary text-[11px] py-1 px-2.5">Editar</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmId((prev) => (prev === c.id ? null : c.id)); }}
                    className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                    style={{ color: confirmId === c.id ? "var(--color-accent)" : "var(--color-text-muted)" }}
                    title="Eliminar casting"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5zM8 12.75a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {confirmId === c.id && (
                    <div className="absolute top-10 right-2 z-10 rounded-[12px] p-3 w-56" style={{ background: "rgba(14,14,16,0.98)", border: "0.5px solid var(--color-border-default)" }} onClick={(e) => e.stopPropagation()}>
                      <div className="text-[13px] font-[500] mb-1" style={{ color: "var(--color-text-primary)" }}>Eliminar este casting</div>
                      <p className="text-[11px] mb-3" style={{ color: "var(--color-text-muted)" }}>Esta acción no se puede deshacer.</p>
                      <div className="flex items-center justify-end gap-2">
                        <button className="ds-btn-secondary text-[11px] py-1 px-2.5" onClick={() => setConfirmId(null)}>Cancelar</button>
                        <button
                          className="text-[11px] py-1 px-2.5 rounded-[6px] transition-colors"
                          style={{ background: "rgba(232,76,43,0.12)", border: "0.5px solid rgba(232,76,43,0.30)", color: deletingId === c.id ? "rgba(232,76,43,0.4)" : "var(--color-accent)" }}
                          onClick={() => onDelete(c.id)}
                          disabled={deletingId === c.id}
                        >{deletingId === c.id ? "Eliminando…" : "Eliminar"}</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-12 px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-[14px] overflow-hidden shadow-2xl" style={{ background: "rgba(14,14,16,0.99)", border: "0.5px solid var(--color-border-default)" }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "0.5px solid var(--color-border-default)" }}>
              <div className="text-[14px] font-[500]" style={{ color: "var(--color-text-primary)" }}>Editar casting</div>
              <button className="w-7 h-7 flex items-center justify-center rounded-full transition-colors" style={{ color: "var(--color-text-muted)" }} onClick={() => setEditOpen(false)}>✕</button>
            </div>
            <form onSubmit={submitEdit} className="p-5 space-y-3 max-h-[75vh] overflow-auto">
              {editError && <div className="text-[13px]" style={{ color: "var(--color-accent)" }}>{editError}</div>}
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Título" className="ds-input" />
              <textarea value={editBrief} onChange={(e) => setEditBrief(e.target.value)} placeholder="Brief / instrucciones" className="ds-input h-24 resize-none" />
              <div>
                <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Fecha límite (opcional)</label>
                <input type="datetime-local" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} className="ds-input" style={{ colorScheme: "dark" }} />
              </div>
              <CastingBusinessFields
                budget={editBudget} onBudget={setEditBudget}
                currency={editCurrency} onCurrency={setEditCurrency}
                status={editStatus} onStatus={setEditStatus}
                client={editClient} onClient={setEditClient}
                mediaType={editMediaType} onMediaType={setEditMediaType}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Video</div>
                  <input id="edit-video" type="file" accept="video/*" onChange={(e) => setEditVideoFile(e.target.files?.[0] || null)} className="hidden" />
                  <div className="flex items-center gap-2 mb-1.5"><button type="button" onClick={() => document.getElementById("edit-video")?.click()} className={fileBtn}>Subir archivo</button><span className={fileName} style={{ color: "var(--color-text-muted)" }}>{editVideoFile?.name || (editVideoUrl ? "Actual: URL" : "Ningún archivo")}</span></div>
                  <input value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="o pegar URL…" className="ds-input" />
                </div>
                <div>
                  <div className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Guion (PDF/DOC/TXT)</div>
                  <input id="edit-script" type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.md,.odt" onChange={(e) => setEditScriptFile(e.target.files?.[0] || null)} className="hidden" />
                  <div className="flex items-center gap-2 mb-1.5"><button type="button" onClick={() => document.getElementById("edit-script")?.click()} className={fileBtn}>Subir guion</button><span className={fileName} style={{ color: "var(--color-text-muted)" }}>{editScriptFile?.name || (editScriptUrl ? "Actual: URL" : "Ningún archivo")}</span></div>
                  <input value={editScriptUrl} onChange={(e) => setEditScriptUrl(e.target.value)} placeholder="o pegar URL…" className="ds-input" />
                </div>
                <div>
                  <div className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Referencia</div>
                  <input id="edit-ref" type="file" onChange={(e) => setEditRefFile(e.target.files?.[0] || null)} className="hidden" />
                  <div className="flex items-center gap-2 mb-1.5"><button type="button" onClick={() => document.getElementById("edit-ref")?.click()} className={fileBtn}>Adjuntar archivo</button><span className={fileName} style={{ color: "var(--color-text-muted)" }}>{editRefFile?.name || (editRefUrl ? "Actual: URL" : "Ningún archivo")}</span></div>
                  <input value={editRefUrl} onChange={(e) => setEditRefUrl(e.target.value)} placeholder="o pegar URL…" className="ds-input" />
                </div>
              </div>
              <div className="pt-3" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
                <div className="text-[12px] font-[500] mb-3 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Características de la voz</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Idioma</label>
                    <select value={editLang} onChange={(e) => { setEditLang(e.target.value); setEditAccent(""); }} className={dsSelect}>
                      <option value="">Cualquiera</option>
                      {idiomasOpts.map((op) => (<option key={op} value={op}>{op}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Acento</label>
                    <select value={editAccent} onChange={(e) => setEditAccent(e.target.value)} className={dsSelect} disabled={!editLang}>
                      <option value="">Cualquiera</option>
                      {(editLang ? (acentosPorIdioma[editLang] || []) : []).map((op) => (<option key={op} value={op}>{op}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Género</label>
                    <select value={editGender} onChange={(e) => setEditGender(e.target.value)} className={dsSelect}>
                      <option value="">Cualquiera</option>
                      {generosOpts.map((op) => (<option key={op} value={op}>{op}</option>))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Estilos</label>
                    <details id="estilos-editar" className="relative group">
                      <summary className="ds-pill cursor-pointer list-none" style={{ listStyle: "none" }} onClick={() => setEditTmpStyles(editStyles)}>
                        <span>{editStyles.length ? `${editStyles.length} seleccionados` : "Seleccionar estilos"}</span>
                        <svg className="inline-block ml-1 w-3 h-3" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--color-text-muted)" }}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                      </summary>
                      <div className="absolute z-20 mt-1 w-64 rounded-[12px] overflow-hidden shadow-2xl" style={{ background: "rgba(18,18,20,0.98)", border: "0.5px solid var(--color-border-default)" }}>
                        <div className="max-h-56 overflow-auto px-3 py-2 flex flex-col gap-1.5">
                          {estilosOpts.map((op) => (
                            <label key={op} className="flex items-start gap-2 text-[13px] cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>
                              <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ accentColor: "var(--color-accent)" }} checked={editTmpStyles.includes(op)} onChange={() => setEditTmpStyles((prev) => toggleInList(prev, op))} />
                              <span className="flex-1 break-words leading-tight">{op}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2 px-3 py-2" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
                          <button type="button" className="ds-btn-secondary text-[11px] py-1 px-2.5" onClick={() => { setEditTmpStyles([]); setEditStyles([]); (document.getElementById("estilos-editar") as HTMLDetailsElement | null)?.removeAttribute("open"); }}>Limpiar</button>
                          <button type="button" className="ds-btn-primary text-[11px] py-1 px-2.5" onClick={() => { setEditStyles(editTmpStyles); (document.getElementById("estilos-editar") as HTMLDetailsElement | null)?.removeAttribute("open"); }}>Aplicar</button>
                        </div>
                      </div>
                    </details>
                  </div>
                  <div>
                    <label className={dsLabel} style={{ color: "var(--color-text-muted)" }}>Rango de edad</label>
                    <details id="edades-editar" className="relative group">
                      <summary className="ds-pill cursor-pointer list-none" style={{ listStyle: "none" }} onClick={() => setEditTmpAges(editAges)}>
                        <span>{editAges.length ? `${editAges.length} seleccionados` : "Seleccionar edades"}</span>
                        <svg className="inline-block ml-1 w-3 h-3" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--color-text-muted)" }}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                      </summary>
                      <div className="absolute z-20 mt-1 w-64 rounded-[12px] overflow-hidden shadow-2xl" style={{ background: "rgba(18,18,20,0.98)", border: "0.5px solid var(--color-border-default)" }}>
                        <div className="max-h-56 overflow-auto px-3 py-2 flex flex-col gap-1.5">
                          {edadesOpts.map((op) => (
                            <label key={op} className="flex items-start gap-2 text-[13px] cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>
                              <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ accentColor: "var(--color-accent)" }} checked={editTmpAges.includes(op)} onChange={() => setEditTmpAges((prev) => toggleInList(prev, op))} />
                              <span className="flex-1 break-words leading-tight">{op}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2 px-3 py-2" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
                          <button type="button" className="ds-btn-secondary text-[11px] py-1 px-2.5" onClick={() => { setEditTmpAges([]); setEditAges([]); (document.getElementById("edades-editar") as HTMLDetailsElement | null)?.removeAttribute("open"); }}>Limpiar</button>
                          <button type="button" className="ds-btn-primary text-[11px] py-1 px-2.5" onClick={() => { setEditAges(editTmpAges); (document.getElementById("edades-editar") as HTMLDetailsElement | null)?.removeAttribute("open"); }}>Aplicar</button>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEditOpen(false)} className="ds-btn-secondary text-[12px] py-1.5 px-3">Cancelar</button>
                <button type="submit" disabled={editSaving} className="ds-btn-primary text-[12px] py-1.5 px-3">{editSaving ? "Guardando…" : "Guardar cambios"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-3 py-2 rounded-md shadow-lg z-[120]">{toast}</div>
      ) : null}
    </>
  );
}
