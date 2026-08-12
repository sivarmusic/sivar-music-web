"use client";
import { useEffect, useMemo, useState } from "react";
import { makeLocutorSlug } from "@/lib/voces-slug";
import { fuzzyMatch } from "@/lib/voces-text";
import { countryToFlag } from "@/lib/voces-country";
import DemoPlayer from "@/app/voces/components/DemoPlayer";
import AddToProject from "@/app/voces/components/AddToProject";
import { extractYouTubeId, isVideoUrl } from "@/lib/voces-media";
import { VOICE_TYPES } from "@/lib/voces-voice";
import { useAuth } from "@/app/voces/components/AuthContext";

const AVATAR_PLACEHOLDER = "/avatar-placeholder.svg";

type Cantante = {
  id: string;
  nombre: string;
  email?: string;
  pais?: string;
  genero?: string | null;   // sexo (M/F)
  tipoVoz?: string | null;  // tesitura (Soprano, Tenor, …)
  idioma: string[];   // languages array
  estilo: string[];   // styles array (géneros musicales)
  notas?: string | null;
  demo?: string;
  slug: string;
};

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function CantantesPage() {
  const [cantantes, setCantantes] = useState<Cantante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin } = useAuth();

  const cargarCantantes = async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/voces/cantantes", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) { setError("Error cargando cantantes"); return; }
      const normalized = (data.cantantes || []).map((c: any, i: number) => ({
        id: c.id,
        nombre: c.nombre ?? "",
        email: c.email ?? "",
        pais: c.pais ?? "",
        genero: c.genero ?? null,
        tipoVoz: c.tipoVoz ?? null,
        idioma: Array.isArray(c.idioma) ? c.idioma : (c.idioma ? [c.idioma] : []),
        estilo: Array.isArray(c.estilo) ? c.estilo : (c.estilo ? [c.estilo] : []),
        notas: c.notas ?? null,
        demo: c.demo ?? "",
        slug: makeLocutorSlug(c.nombre ?? "", c.id ?? `tmp-${i}`),
      }));
      setCantantes(normalized);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCantantes();
  }, []);

  // ── Filtros ──────────────────────────────────────────────────
  const [busqueda, setBusqueda] = useState("");
  const [fIdioma, setFIdioma] = useState("");
  const [fPais, setFPais] = useState("");
  const [fEstilos, setFEstilos] = useState<string[]>([]);
  const [tmpEstilos, setTmpEstilos] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"relevance" | "name">("relevance");

  const idiomasOpts = useMemo(() => {
    const s = new Set<string>();
    for (const c of cantantes) for (const l of c.idioma) if (l) s.add(l);
    return Array.from(s).sort();
  }, [cantantes]);

  const paisesOpts = useMemo(() => {
    const s = new Set<string>();
    for (const c of cantantes) if (c.pais) s.add(c.pais);
    return Array.from(s).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [cantantes]);

  const estilosOpts = useMemo(() => {
    const s = new Set<string>();
    for (const c of cantantes) for (const e of c.estilo) if (e) s.add(e);
    return Array.from(s).sort();
  }, [cantantes]);

  const resetFiltros = () => { setBusqueda(""); setFIdioma(""); setFPais(""); setFEstilos([]); setTmpEstilos([]); };
  const hayFiltros = !!(busqueda || fIdioma || fPais || fEstilos.length);

  const filtrados = useMemo(() => {
    const q = busqueda.trim();
    return cantantes.filter((c) => {
      const nameOK = !q || fuzzyMatch(c.nombre || "", q);
      const idiomaOK = fIdioma ? c.idioma.some((l) => l === fIdioma) : true;
      const paisOK = fPais ? c.pais === fPais : true;
      const estilosOK = fEstilos.length ? fEstilos.some((e) => c.estilo.includes(e)) : true;
      return nameOK && idiomaOK && paisOK && estilosOK;
    });
  }, [cantantes, busqueda, fIdioma, fPais, fEstilos]);

  const sorted = useMemo(() => {
    if (sortBy === "name") return [...filtrados].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" }));
    return filtrados;
  }, [filtrados, sortBy]);

  const activeChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    if (busqueda) chips.push({ label: `"${busqueda}"`, onRemove: () => setBusqueda("") });
    if (fIdioma) chips.push({ label: fIdioma, onRemove: () => setFIdioma("") });
    if (fPais) chips.push({ label: fPais, onRemove: () => setFPais("") });
    for (const e of fEstilos) chips.push({ label: e, onRemove: () => setFEstilos((p) => p.filter((x) => x !== e)) });
    return chips;
  }, [busqueda, fIdioma, fPais, fEstilos]);

  // ── Alta / edición de cantante (admin) ───────────────────────
  const emptyForm = { nombre: "", email: "", pais: "", genero: "", tipoVoz: "", idioma: "", notas: "", demo: "" };
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingDemo, setUploadingDemo] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const setField = (k: keyof typeof emptyForm, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const abrirModal = () => { setEditId(null); setForm(emptyForm); setFormError(null); setShowModal(true); };

  const abrirEdicion = (c: Cantante) => {
    setEditId(c.id);
    setForm({
      nombre: c.nombre ?? "",
      email: c.email ?? "",
      pais: c.pais ?? "",
      genero: c.genero ?? "",
      tipoVoz: c.tipoVoz ?? "",
      idioma: (c.idioma ?? []).join(", "),
      notas: c.notas ?? "",
      demo: c.demo ?? "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const subirDemo = async (file: File) => {
    setUploadingDemo(true);
    setFormError(null);
    try {
      const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
      const folder = isVideo ? "cantante-videos" : "cantante-audios";
      const r = await fetch("/api/voces/admin/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, folder, mimeType: file.type || "application/octet-stream" }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo iniciar la subida");
      const up = await fetch(j.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
      if (!up.ok) throw new Error("Error al subir el archivo");
      setField("demo", j.publicUrl as string);
    } catch (e: any) {
      setFormError(e?.message ?? "Error al subir el demo");
    } finally {
      setUploadingDemo(false);
    }
  };

  const guardarCantante = async () => {
    if (!form.nombre.trim()) { setFormError("El nombre es obligatorio"); return; }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        pais: form.pais.trim(),
        gender: form.genero,
        voiceType: form.tipoVoz,
        idioma: form.idioma,
        notas: form.notas.trim(),
        demo: form.demo.trim(),
      };
      const res = await fetch("/api/voces/admin/cantantes", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { id: editId, ...payload } : payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) { setFormError(data?.error || "No se pudo guardar"); return; }
      setShowModal(false);
      await cargarCantantes();
    } catch (e: any) {
      setFormError(e?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  const [eliminando, setEliminando] = useState<string | null>(null);

  const eliminarCantante = async (c: Cantante) => {
    if (!confirm(`¿Eliminar a "${c.nombre}"? Esta acción no se puede deshacer.`)) return;
    setEliminando(c.id);
    try {
      const res = await fetch(`/api/voces/admin/cantantes?id=${encodeURIComponent(c.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) { alert(data?.error || "No se pudo eliminar"); return; }
      setCantantes((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e: any) {
      alert(e?.message ?? "Error");
    } finally {
      setEliminando(null);
    }
  };

  // ── UI ───────────────────────────────────────────────────────
  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ borderBottom: "0.5px solid var(--color-border-default)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top left, rgba(100,76,200,0.08) 0%, transparent 60%)" }} />
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16 relative">
          <div className="inline-flex items-center gap-2 mb-5 rounded-full px-3 py-1" style={{ background: "rgba(100,76,200,0.08)", border: "0.5px solid rgba(100,76,200,0.20)" }}>
            <span className="w-1.5 h-1.5 rounded-full dot-pulse" style={{ background: "#644cc8" }} />
            <span className="text-[11px] font-[500] tracking-widest uppercase" style={{ color: "#644cc8" }}>Sivar Music</span>
          </div>
          <h1 className="text-[38px] md:text-[56px] leading-none tracking-[-0.02em]" style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
            Catálogo de Cantantes
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed max-w-lg" style={{ color: "var(--color-text-secondary)" }}>
            Buscá por nombre o filtrá por idioma, país y estilo musical.
          </p>
        </div>
      </div>

      {/* Filtros + Grid */}
      <section className="mx-auto max-w-6xl px-4 mt-6">
        {/* Barra de búsqueda */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--color-text-muted)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre…" className="ds-input pl-10" />
        </div>

        {/* Filtros en píldoras */}
        <div className="flex items-center gap-2 pb-2 mb-4 flex-wrap">
          {/* Idioma */}
          <div className="relative shrink-0">
            <select value={fIdioma} onChange={(e) => setFIdioma(e.target.value)} className={`ds-pill appearance-none pr-6 [color-scheme:dark]${fIdioma ? " active" : ""}`}>
              <option value="">Idioma</option>
              {idiomasOpts.map((op) => <option key={op} value={op}>{op}</option>)}
            </select>
            <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "var(--color-text-muted)" }} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>

          {/* País */}
          <div className="relative shrink-0">
            <select value={fPais} onChange={(e) => setFPais(e.target.value)} className={`ds-pill appearance-none pr-6 [color-scheme:dark]${fPais ? " active" : ""}`}>
              <option value="">País</option>
              {paisesOpts.map((op) => <option key={op} value={op}>{op}</option>)}
            </select>
            <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "var(--color-text-muted)" }} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>

          {/* Estilo musical (multi-check) */}
          <details id="estilo-cantante-dropdown" className="group relative shrink-0"
            onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) setTmpEstilos(fEstilos); }}>
            <summary className={`ds-pill cursor-pointer${fEstilos.length > 0 ? " active" : ""}`} style={{ listStyle: "none" }}>
              {fEstilos.length > 0 ? `${fEstilos.length} seleccionados` : "Estilo"}
              <svg className="inline-block ml-1 w-3 h-3 transition-transform duration-200 group-open:-rotate-180" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--color-text-muted)" }}>
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </summary>
            <div className="absolute left-0 z-20 mt-2 w-64 rounded-[12px] overflow-hidden shadow-2xl" style={{ background: "rgba(18,18,20,0.98)", border: "0.5px solid var(--color-border-default)" }}>
              <div className="max-h-56 overflow-auto px-4 py-3 flex flex-col gap-2">
                {estilosOpts.map((op) => (
                  <label key={op} className="flex items-center gap-2.5 text-[13px] cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>
                    <input type="checkbox" className="h-3.5 w-3.5 rounded" style={{ accentColor: "#644cc8" }} checked={tmpEstilos.includes(op)} onChange={() => setTmpEstilos((p) => toggleInList(p, op))} />
                    {op}
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 px-4 py-2.5" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
                <button onClick={() => { setTmpEstilos([]); setFEstilos([]); (document.getElementById("estilo-cantante-dropdown") as HTMLDetailsElement | null)?.removeAttribute("open"); }} className="ds-btn-secondary text-[12px] py-1.5 px-3">Limpiar</button>
                <button onClick={() => { setFEstilos(tmpEstilos); (document.getElementById("estilo-cantante-dropdown") as HTMLDetailsElement | null)?.removeAttribute("open"); }} className="ds-btn-primary text-[12px] py-1.5 px-3">Aplicar</button>
              </div>
            </div>
          </details>

          {hayFiltros && (
            <button onClick={resetFiltros} className="shrink-0 text-[12px] font-[500] px-3 py-1.5 rounded-full transition-colors" style={{ color: "#644cc8", background: "rgba(100,76,200,0.08)", border: "0.5px solid rgba(100,76,200,0.20)" }}>
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Chips activos + Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-2">
            {activeChips.length > 0 ? activeChips.map((chip) => (
              <button key={chip.label} onClick={chip.onRemove} className="inline-flex items-center gap-1.5 rounded-full text-[12px] font-[500] px-2.5 py-1" style={{ background: "rgba(100,76,200,0.08)", border: "0.5px solid rgba(100,76,200,0.20)", color: "#644cc8" }}>
                <span className="truncate max-w-[8rem]">{chip.label}</span>
                <span>×</span>
              </button>
            )) : (
              <span className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>{sorted.length} {sorted.length === 1 ? "resultado" : "resultados"}</span>
            )}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {activeChips.length > 0 && <span className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>{sorted.length} resultado{sorted.length !== 1 ? "s" : ""}</span>}
            <div className="relative">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="ds-pill appearance-none pr-6 [color-scheme:dark]">
                <option value="relevance">Relevancia</option>
                <option value="name">Nombre</option>
              </select>
              <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "var(--color-text-muted)" }} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Grid de resultados */}
        {cargando ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-24 md:pb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="ds-card flex flex-col overflow-hidden" style={{ animation: `softPulse 1.6s ease-in-out ${i * 80}ms infinite` }}>
                <div className="h-[140px]" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.04), rgba(255,255,255,0.02))" }}>
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-[72px] h-[72px] rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-2.5">
                  <div className="h-3 rounded flex-1 max-w-[60%]" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <div className="h-4 w-24 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <div className="h-[42px] rounded-[9px] mt-1" style={{ background: "rgba(255,255,255,0.04)" }} />
                  <div className="h-9 rounded-lg mt-1" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-center py-16 text-[14px]" style={{ color: "var(--color-accent)" }}>{error}</p>
        ) : sorted.length === 0 ? (
          <p className="text-center py-16 text-[14px]" style={{ color: "var(--color-text-muted)" }}>Sin resultados. Probá cambiando los filtros.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-24 md:pb-8">
            {sorted.map((c, idx) => {
              const displayName = c.nombre;
              const flag = countryToFlag(c.pais);
              const primaryLang = c.idioma[0];
              const extraCount = c.idioma.length > 1 ? c.idioma.length - 1 : 0;
              const estiloLabel = c.estilo.join(", ");
              return (
                <article key={c.id} className="ds-card relative flex flex-col overflow-hidden card-enter" style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}>
                  {/* Agregar a proyecto (clientes) */}
                  <AddToProject
                    category="cantante"
                    align="left"
                    item={{ type: "cantante", cantanteId: c.id, nombre: c.nombre, idioma: c.idioma.join(", "), genero: c.genero || "", estilo: c.estilo.join(", "), demo: c.demo || "", pais: c.pais }}
                  />
                  {/* Acciones admin */}
                  {isAdmin && (
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
                      <button
                        onClick={() => abrirEdicion(c)}
                        aria-label={`Editar ${displayName}`}
                        title="Editar cantante"
                        className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
                        style={{ background: "rgba(0,0,0,0.55)", color: "#fff", border: "0.5px solid rgba(255,255,255,0.18)", backdropFilter: "blur(4px)" }}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => eliminarCantante(c)}
                        disabled={eliminando === c.id}
                        aria-label={`Eliminar ${displayName}`}
                        title="Eliminar cantante"
                        className="flex items-center justify-center w-8 h-8 rounded-full transition-colors disabled:opacity-50"
                        style={{ background: "rgba(0,0,0,0.55)", color: "#fff", border: "0.5px solid rgba(255,255,255,0.18)", backdropFilter: "blur(4px)" }}
                      >
                        {eliminando === c.id ? (
                          <span className="text-[11px]">…</span>
                        ) : (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6m3 5v6m4-6v6" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                  {/* Avatar */}
                  <a href={`/voces/cantante/${c.slug}`} className="block">
                    <div className="h-[140px] flex items-center justify-center" style={{ background: "linear-gradient(to bottom, rgba(100,76,200,0.10), rgba(255,255,255,0.02))" }}>
                      <img src={AVATAR_PLACEHOLDER} alt={displayName} className="w-[72px] h-[72px] rounded-full object-cover" style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.10)" }} />
                    </div>
                  </a>
                  {/* Body */}
                  <div className="flex flex-col flex-1 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {flag && <span className="text-base shrink-0">{flag}</span>}
                      <a href={`/voces/cantante/${c.slug}`} className="text-[16px] font-[500] leading-tight truncate hover:opacity-80 transition-opacity" style={{ color: "var(--color-text-primary)" }}>
                        {displayName}
                      </a>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {primaryLang && (
                        <span className="inline-block text-[11px] font-[500] px-2 py-0.5 rounded-[5px]" style={{ background: "rgba(100,76,200,0.10)", border: "0.5px solid rgba(100,76,200,0.25)", color: "#644cc8" }}>
                          {primaryLang}
                        </span>
                      )}
                      {extraCount > 0 && (
                        <span className="inline-block text-[11px] font-[500] px-2 py-0.5 rounded-[5px]" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
                          +{extraCount}
                        </span>
                      )}
                      {c.genero && (
                        <span className="inline-block text-[11px] font-[500] px-2 py-0.5 rounded-[5px]" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
                          {c.genero}
                        </span>
                      )}
                    </div>
                    {estiloLabel && (
                      <p className="text-[12px] leading-snug line-clamp-2 mb-3" style={{ color: "var(--color-text-muted)" }}>{estiloLabel}</p>
                    )}
                    {c.demo ? (
                      <DemoPlayer src={c.demo} ariaLabel={`Demo de ${displayName}`} trackName={displayName} />
                    ) : (
                      <div className="h-[42px] rounded-[9px] flex items-center justify-center text-[11px]" style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
                        Sin demo
                      </div>
                    )}
                    {c.notas && (
                      <div
                        className="mt-2 rounded-[9px] px-3 py-2.5 text-[11px] leading-relaxed"
                        style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-muted)" }}
                      >
                        {c.notas}
                      </div>
                    )}
                    <div className="mt-3">
                      <a href={`/voces/cantante/${c.slug}`} className="ds-btn-primary block text-center text-[13px]">
                        Ver perfil
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Botón flotante + (solo admin) */}
      {isAdmin && (
        <button
          onClick={abrirModal}
          aria-label="Agregar cantante"
          title="Agregar cantante"
          className="fixed bottom-6 right-6 z-30 flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95"
          style={{ background: "#644cc8", color: "#fff", border: "0.5px solid rgba(255,255,255,0.20)" }}
        >
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      {/* Modal de alta */}
      {showModal && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => !saving && setShowModal(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-[20px] sm:rounded-[16px] overflow-hidden shadow-2xl"
            style={{ background: "rgba(18,18,20,0.99)", border: "0.5px solid var(--color-border-default)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "0.5px solid var(--color-border-default)" }}>
              <h2 className="text-[17px] font-[500]" style={{ color: "var(--color-text-primary)" }}>{editId ? "Editar cantante" : "Nuevo cantante"}</h2>
              <button onClick={() => !saving && setShowModal(false)} aria-label="Cerrar" className="text-[20px] leading-none px-1" style={{ color: "var(--color-text-muted)" }}>×</button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-3.5 max-h-[70vh] overflow-auto">
              <div>
                <label className="block text-[12px] mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Nombre *</label>
                <input value={form.nombre} onChange={(e) => setField("nombre", e.target.value)} className="ds-input" placeholder="Nombre del cantante" />
              </div>
              <div>
                <label className="block text-[12px] mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Mail</label>
                <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className="ds-input" placeholder="correo@ejemplo.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] mb-1.5" style={{ color: "var(--color-text-secondary)" }}>País</label>
                  <input value={form.pais} onChange={(e) => setField("pais", e.target.value)} className="ds-input" list="paises-list" placeholder="País" />
                  <datalist id="paises-list">{paisesOpts.map((p) => <option key={p} value={p} />)}</datalist>
                </div>
                <div>
                  <label className="block text-[12px] mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Género</label>
                  <select value={form.genero} onChange={(e) => setField("genero", e.target.value)} className="ds-input [color-scheme:dark]">
                    <option value="">—</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[12px] mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Tipo de voz</label>
                <select value={form.tipoVoz} onChange={(e) => setField("tipoVoz", e.target.value)} className="ds-input [color-scheme:dark]">
                  <option value="">—</option>
                  {VOICE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>Se usa para agrupar los proyectos. Si lo dejás vacío, se infiere de las notas.</p>
              </div>
              <div>
                <label className="block text-[12px] mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Idioma</label>
                <input value={form.idioma} onChange={(e) => setField("idioma", e.target.value)} className="ds-input" placeholder="Español, Inglés…" />
                <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>Separá varios idiomas con comas.</p>
              </div>
              <div>
                <label className="block text-[12px] mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Notas</label>
                <textarea value={form.notas} onChange={(e) => setField("notas", e.target.value)} rows={3} className="ds-input resize-none" placeholder="Comentarios de voz, estilo, etc." />
              </div>

              {/* Demo: audio, video o link de YouTube */}
              <div>
                <label className="block text-[12px] mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Demo</label>

                {form.demo && (
                  <div className="mb-2 flex flex-col gap-2">
                    <DemoPlayer src={form.demo} ariaLabel="Demo del cantante" trackName={form.nombre || "Demo"} />
                    <div>
                      <button type="button" onClick={() => setField("demo", "")} disabled={uploadingDemo}
                        className="text-[12px] py-1.5 px-3 rounded-full transition-colors disabled:opacity-50"
                        style={{ color: "var(--color-accent)", background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.20)" }}>
                        Quitar demo
                      </button>
                    </div>
                  </div>
                )}

                {/* Link de YouTube, Google Drive o cualquier URL */}
                <input
                  value={form.demo}
                  onChange={(e) => setField("demo", e.target.value)}
                  className="ds-input"
                  placeholder="Pegá un link de YouTube, Google Drive, Instagram o una URL"
                />
                {form.demo && !extractYouTubeId(form.demo) && !isVideoUrl(form.demo) && !/^https?:\/\//i.test(form.demo) && (
                  <p className="text-[11px] mt-1" style={{ color: "var(--color-accent)" }}>Eso no parece una URL válida.</p>
                )}

                {/* Subir archivo (audio o video) */}
                <label className="mt-2 flex items-center justify-center gap-2 h-[42px] rounded-[9px] cursor-pointer text-[12px] transition-colors"
                  style={{ background: "rgba(255,255,255,0.02)", border: "0.5px dashed var(--color-border-default)", color: "var(--color-text-muted)" }}>
                  {uploadingDemo ? "Subiendo…" : (form.demo ? "Reemplazar por un archivo (mp3, wav, mp4, mov)" : "Subir archivo (mp3, wav, mp4, mov)")}
                  <input type="file" accept="audio/*,video/*,.mp3,.wav,.mp4,.mov,.m4a,.webm" className="hidden" disabled={uploadingDemo}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) subirDemo(f); e.currentTarget.value = ""; }} />
                </label>
              </div>

              {formError && <p className="text-[12px]" style={{ color: "var(--color-accent)" }}>{formError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
              <button onClick={() => !saving && setShowModal(false)} className="ds-btn-secondary text-[13px] py-2 px-4" disabled={saving}>Cancelar</button>
              <button onClick={guardarCantante} className="ds-btn-primary text-[13px] py-2 px-4" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
