"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { slugifyName, makeLocutorSlug } from "@/lib/voces-slug";
import { getFirstName } from "@/lib/voces-names";
import { countryToFlag } from "@/lib/voces-country";
import { toArray } from "@/lib/voces-arrays";
import { normalizeForSearch } from "@/lib/voces-text";
import AudioPlayer from "@/app/voces/components/AudioPlayer";
import AddToProject from "@/app/voces/components/AddToProject";
import { useI18n } from "@/app/voces/components/I18n";

type Locutor = {
  id: string;
  nombre: string;
  idioma: string;
  genero: string;
  estilo: string;
  edad: string;
  demo: string;
  pais?: string;
  code?: number;
};

export default function LocationPage() {
  const { slug } = useParams();
  const { t } = useI18n();
  const [items, setItems] = useState<Locutor[]>([]);
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // filtros
  const [busqueda, setBusqueda] = useState("");
  const [fGenero, setFGenero] = useState("");
  const [fEstilos, setFEstilos] = useState<string[]>([]);
  const [tmpEstilos, setTmpEstilos] = useState<string[]>([]);
  const [fEdades, setFEdades] = useState<string[]>([]);
  const [tmpEdades, setTmpEdades] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/voces/locutores", { cache: "no-store" });
        const j = await res.json();
        if (!j?.ok || !Array.isArray(j.locutores)) throw new Error("No data");
        const list: Locutor[] = j.locutores || [];
        const filtered = list.filter((l) => l.pais && slugifyName(String(l.pais)) === String(slug));
        if (!cancelled) {
          setItems(filtered);
          const name = filtered[0]?.pais || "";
          setTitle(name);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (slug) load();
    return () => { cancelled = true; };
  }, [slug]);

  // Cerrar dropdowns de filtros con click afuera o Escape
  useEffect(() => {
    const ids = ["estilo-dropdown-location", "edad-dropdown-location"];
    const onDocClick = (e: MouseEvent) => {
      ids.forEach((id) => {
        const el = document.getElementById(id) as HTMLDetailsElement | null;
        if (el && el.open && e.target instanceof Node && !el.contains(e.target)) el.removeAttribute("open");
      });
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") ids.forEach((id) => {
        const el = document.getElementById(id) as HTMLDetailsElement | null;
        if (el) el.removeAttribute("open");
      });
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // helpers filtros
  function splitList(value: string) {
    if (!value) return [] as string[];
    return toArray(value);
  }
  function toggleInList(list: string[], value: string) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }
  function formatFilterLabel(label: string) {
    if (!label) return "";
    return label.replace(/\s*\/\s*/g, " / ");
  }

  const generosOpts = useMemo(() => {
    const s = new Set<string>();
    for (const l of items) if (l.genero) s.add(l.genero);
    return Array.from(s).sort();
  }, [items]);
  const estilosOpts = useMemo(() => {
    const s = new Set<string>();
    for (const l of items) for (const e of splitList(l.estilo)) s.add(e);
    return Array.from(s).sort();
  }, [items]);
  const edadesOpts = useMemo(() => {
    const s = new Set<string>();
    for (const l of items) for (const e of splitList(l.edad)) s.add(e);
    return Array.from(s).sort();
  }, [items]);

  const resetFiltros = () => {
    setBusqueda("");
    setFGenero("");
    setFEstilos([]);
    setFEdades([]);
  };

  const hayFiltrosActivos = busqueda || fGenero || fEstilos.length || fEdades.length;

  const filtrados = useMemo(() => {
    let list = items;
    if (busqueda) {
      const q = normalizeForSearch(busqueda);
      list = list.filter((l) =>
        normalizeForSearch(`${l.nombre} ${l.idioma} ${l.estilo} ${l.edad}`).includes(q)
      );
    }
    if (fGenero) list = list.filter((l) => l.genero === fGenero);
    if (fEstilos.length) {
      list = list.filter((l) => {
        const set = new Set(splitList(l.estilo));
        return fEstilos.some((e) => set.has(e));
      });
    }
    if (fEdades.length) {
      list = list.filter((l) => {
        const set = new Set(splitList(l.edad));
        return fEdades.some((e) => set.has(e));
      });
    }
    return list;
  }, [items, busqueda, fGenero, fEstilos, fEdades]);

  const flag = countryToFlag(title);

  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ borderBottom: "0.5px solid var(--color-border-default)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top left, rgba(232,76,43,0.06) 0%, transparent 60%)" }} />
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14 relative">
          <h1 className="flex items-center gap-3 text-[32px] md:text-[44px] leading-none tracking-[-0.02em]" style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
            {flag && <span className="text-[36px] md:text-[48px]">{flag}</span>}
            <span>{title || t("location")}</span>
          </h1>
          <p className="mt-3 text-[14px]" style={{ color: "var(--color-text-muted)" }}>
            {filtrados.length} {filtrados.length === 1 ? "locutor" : "locutores"}
          </p>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 mt-6">
        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--color-text-muted)" }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t("searchByName")}
            className="ds-input pl-10"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-5" style={{ scrollbarWidth: "none" }}>
          {/* Género */}
          <div className="relative shrink-0">
            <select
              value={fGenero}
              onChange={(e) => setFGenero(e.target.value)}
              className={`ds-pill appearance-none pr-6 [color-scheme:dark]${fGenero ? " active" : ""}`}
            >
              <option value="">{t("gender")}</option>
              {generosOpts.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "var(--color-text-muted)" }} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>

          {/* Estilo */}
          <details
            id="estilo-dropdown-location"
            className="group relative shrink-0"
            onToggle={(event) => { const el = event.currentTarget as HTMLDetailsElement; if (el.open) setTmpEstilos(fEstilos); }}
          >
            <summary className={`ds-pill cursor-pointer${fEstilos.length > 0 ? " active" : ""}`} style={{ listStyle: "none" }}>
              {fEstilos.length > 0 ? t("selectedCount").replace("{count}", String(fEstilos.length)) : t("style")}
              <svg className="inline-block ml-1 w-3 h-3 transition-transform duration-200 group-open:-rotate-180" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--color-text-muted)" }}>
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </summary>
            <div className="absolute left-0 z-20 mt-2 w-72 rounded-[12px] overflow-hidden shadow-2xl" style={{ background: "rgba(18,18,20,0.98)", border: "0.5px solid var(--color-border-default)" }}>
              <div className="max-h-64 overflow-auto px-4 py-3 flex flex-col gap-2">
                {estilosOpts.map((op) => (
                  <label key={op} className="flex items-start gap-2.5 text-[13px] cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>
                    <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded" style={{ accentColor: "var(--color-accent)" }} checked={tmpEstilos.includes(op)} onChange={() => setTmpEstilos((prev) => toggleInList(prev, op))} />
                    <span className="flex-1 break-words leading-tight">{formatFilterLabel(op)}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 px-4 py-2.5" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
                <button onClick={() => { setTmpEstilos([]); setFEstilos([]); const el = document.getElementById("estilo-dropdown-location") as HTMLDetailsElement | null; if (el) el.removeAttribute("open"); }} className="ds-btn-secondary text-[12px] py-1.5 px-3">{t("clear")}</button>
                <button onClick={() => { setFEstilos(tmpEstilos); const el = document.getElementById("estilo-dropdown-location") as HTMLDetailsElement | null; if (el) el.removeAttribute("open"); }} className="ds-btn-primary text-[12px] py-1.5 px-3">{t("apply")}</button>
              </div>
            </div>
          </details>

          {/* Edad */}
          <details
            id="edad-dropdown-location"
            className="group relative shrink-0"
            onToggle={(event) => { const el = event.currentTarget as HTMLDetailsElement; if (el.open) setTmpEdades(fEdades); }}
          >
            <summary className={`ds-pill cursor-pointer${fEdades.length > 0 ? " active" : ""}`} style={{ listStyle: "none" }}>
              {fEdades.length > 0 ? t("selectedCount").replace("{count}", String(fEdades.length)) : t("ageRange")}
              <svg className="inline-block ml-1 w-3 h-3 transition-transform duration-200 group-open:-rotate-180" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--color-text-muted)" }}>
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </summary>
            <div className="absolute left-0 z-20 mt-2 w-72 rounded-[12px] overflow-hidden shadow-2xl" style={{ background: "rgba(18,18,20,0.98)", border: "0.5px solid var(--color-border-default)" }}>
              <div className="max-h-64 overflow-auto px-4 py-3 flex flex-col gap-2">
                {edadesOpts.map((op) => (
                  <label key={op} className="flex items-start gap-2.5 text-[13px] cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>
                    <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded" style={{ accentColor: "var(--color-accent)" }} checked={tmpEdades.includes(op)} onChange={() => setTmpEdades((prev) => toggleInList(prev, op))} />
                    <span className="flex-1 break-words leading-tight">{formatFilterLabel(op)}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 px-4 py-2.5" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
                <button onClick={() => { setTmpEdades([]); setFEdades([]); const el = document.getElementById("edad-dropdown-location") as HTMLDetailsElement | null; if (el) el.removeAttribute("open"); }} className="ds-btn-secondary text-[12px] py-1.5 px-3">{t("clear")}</button>
                <button onClick={() => { setFEdades(tmpEdades); const el = document.getElementById("edad-dropdown-location") as HTMLDetailsElement | null; if (el) el.removeAttribute("open"); }} className="ds-btn-primary text-[12px] py-1.5 px-3">{t("apply")}</button>
              </div>
            </div>
          </details>

          {hayFiltrosActivos && (
            <button onClick={resetFiltros} className="shrink-0 text-[12px] font-[500] px-3 py-1.5 rounded-full transition-colors duration-200" style={{ color: "var(--color-accent)", background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.20)" }}>
              {t("clearFilters")}
            </button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <p className="text-center py-16 text-[14px]" style={{ color: "var(--color-text-muted)" }}>{t("loading")}</p>
        ) : error ? (
          <p className="text-center py-16 text-[14px]" style={{ color: "var(--color-accent)" }}>{error}</p>
        ) : items.length === 0 ? (
          <p className="text-center py-16 text-[14px]" style={{ color: "var(--color-text-muted)" }}>{t("noVoicesForLocation")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-24 md:pb-8">
            {filtrados.map((l, idx) => {
              const displayName = getFirstName(l.nombre) || l.nombre;
              const idPart = typeof l.code === "number" ? String(l.code) : l.id;
              const slugLoc = makeLocutorSlug(l.nombre || "", idPart);
              const langStr = l.idioma ? toArray(l.idioma)[0]?.trim() : "";
              return (
                <article
                  key={l.id}
                  className="ds-card relative flex flex-col overflow-hidden card-enter"
                  style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}
                >
                  <AddToProject item={{ type: "locutor", nombre: l.nombre, idioma: l.idioma, genero: l.genero, estilo: l.estilo, edad: l.edad, demo: l.demo, pais: l.pais }} />
                  <a href={`/voces/locutor/${slugLoc}`} className="block">
                    <div className="h-[140px] flex items-center justify-center" style={{ background: "linear-gradient(to bottom, rgba(232,76,43,0.08), rgba(255,255,255,0.02))" }}>
                      <img src="/avatar-placeholder.svg" alt={displayName} className="w-[72px] h-[72px] rounded-full object-cover" style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.10)" }} />
                    </div>
                  </a>
                  <div className="flex flex-col flex-1 p-4">
                    <a href={`/voces/locutor/${slugLoc}`} className="text-[16px] font-[500] leading-tight mb-2 hover:opacity-80 transition-opacity" style={{ color: "var(--color-text-primary)" }}>
                      {displayName}
                    </a>
                    {langStr && (
                      <span className="inline-block self-start text-[11px] font-[500] px-2 py-0.5 rounded-[5px] mb-3" style={{ background: "rgba(232,76,43,0.10)", border: "0.5px solid rgba(232,76,43,0.25)", color: "var(--color-accent)" }}>
                        {langStr}
                      </span>
                    )}
                    <AudioPlayer src={l.demo} ariaLabel={t("demoOf").replace("{name}", displayName)} />
                    <div className="mt-3">
                      <a href={`/voces/locutor/${slugLoc}`} className="ds-btn-primary block text-center text-[13px]">
                        {t("viewProfile")}
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
