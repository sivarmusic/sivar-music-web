"use client";
import { useEffect, useMemo, useState } from "react";
import { makeLocutorSlug, slugifyName } from "@/lib/voces-slug";
import { getFirstName } from "@/lib/voces-names";
import { countryToFlag } from "@/lib/voces-country";
import { asText, toArray } from "@/lib/voces-arrays";
import { fuzzyMatch } from "@/lib/voces-text";
import AddToProject from "@/app/voces/components/AddToProject";
import { useI18n } from "@/app/voces/components/I18n";
import AudioPlayer from "@/app/voces/components/AudioPlayer";
import { normalizeDemoUrl } from "@/lib/voces-demo";

const AVATAR_PLACEHOLDER = "/avatar-placeholder.svg";

/* =========================
   Tipos
========================= */
type Locutor = {
  id: string;
  nombre: string;
  idioma: string;     // viene combinado ej: "Spanish - Neutral, English - Latin/Hispanic"
  genero: string;
  estilo: string;     // ej: "Commercial/Advertising, Narration"
  edad: string;       // ej: "Young Adult (18-35), Teen (13-17)"
  foto: string;
  demo: string;
  slug?: string;
  pais?: string;
  code?: number;
};

/* =========================
   Helpers (parseo y utilidades)
========================= */
type Pair = { lang: string; accent: string };

const LANGUAGE_CANONICAL: Record<string, string[]> = {
  Spanish: ["spanish", "espanol", "español", "castellano"],
  English: ["english", "ingles", "inglés"],
  Portuguese: ["portuguese", "portugues", "portugués"],
  Italian: ["italian", "italiano"],
  French: ["french", "frances", "francés"],
  German: ["german", "aleman", "alemán", "deutsch"],
  Catalan: ["catalan", "catalán"],
  Galician: ["galician", "gallego"],
  Basque: ["basque", "euskera"],
  Quechua: ["quechua"],
};

const LANGUAGE_TOKEN_TO_CANONICAL = new Map<string, string>();
for (const [canonical, tokens] of Object.entries(LANGUAGE_CANONICAL)) {
  for (const token of tokens) {
    LANGUAGE_TOKEN_TO_CANONICAL.set(token, canonical);
  }
}

const COUNTRY_LANGUAGE_HINTS: Record<string, string> = {
  argentina: "Spanish",
  argentino: "Spanish",
  mexico: "Spanish",
  mexicano: "Spanish",
  mexicana: "Spanish",
  colombia: "Spanish",
  colombiano: "Spanish",
  colombiana: "Spanish",
  chile: "Spanish",
  chileno: "Spanish",
  chilena: "Spanish",
  peru: "Spanish",
  peruano: "Spanish",
  peruana: "Spanish",
  ecuador: "Spanish",
  ecuatoriano: "Spanish",
  ecuatoriana: "Spanish",
  paraguay: "Spanish",
  paraguayo: "Spanish",
  paraguaya: "Spanish",
  uruguay: "Spanish",
  uruguayo: "Spanish",
  uruguaya: "Spanish",
  bolivia: "Spanish",
  boliviano: "Spanish",
  boliviana: "Spanish",
  venezuela: "Spanish",
  venezolano: "Spanish",
  venezolana: "Spanish",
  guatemala: "Spanish",
  honduras: "Spanish",
  nicaragua: "Spanish",
  panama: "Spanish",
  panameno: "Spanish",
  panamena: "Spanish",
  salvador: "Spanish",
  salvadoreno: "Spanish",
  salvadorena: "Spanish",
  dominicana: "Spanish",
  dominican: "Spanish",
  caribe: "Spanish",
  caribbean: "Spanish",
  puertorriqueno: "Spanish",
  puertorriquena: "Spanish",
  puerto: "Spanish",
  rico: "Spanish",
  latino: "Spanish",
  hispanic: "Spanish",
  brasil: "Portuguese",
  brazil: "Portuguese",
  portugues: "Portuguese",
  portuguesa: "Portuguese",
  portugal: "Portuguese",
  british: "English",
  american: "English",
  canadiense: "English",
  canadian: "English",
  australian: "English",
  ireland: "English",
  irish: "English",
};

const UNKNOWN_LANGUAGE = "Otros";

function removeDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function tokenize(text: string): string[] {
  if (!text) return [];
  const cleaned = removeDiacritics(text)
    .replace(/[^a-z0-9/]+/gi, " ")
    .replace(/\//g, " ")
    .toLowerCase()
    .trim();
  if (!cleaned) return [];
  return cleaned.split(/\s+/);
}

function detectLanguageFromTokens(tokens: string[]): string | null {
  for (const token of tokens) {
    const lang = LANGUAGE_TOKEN_TO_CANONICAL.get(token);
    if (lang) return lang;
  }
  for (const token of tokens) {
    const hint = COUNTRY_LANGUAGE_HINTS[token];
    if (hint) return hint;
  }
  return null;
}

function prettifyAccent(text: string): string {
  if (!text) return "";
  return text
    .split(/(\s+|\/|,|-)/)
    .map((segment) => {
      if (!segment) return "";
      if (/^\s+$/.test(segment)) return segment;
      if (segment === "/" || segment === "," || segment === "-") return segment;
      if (segment === segment.toUpperCase()) return segment;
      return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
    })
    .join("")
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*-\s*/g, " - ")
    .trim();
}

function cleanupAccent(raw: string, lang: string): string {
  if (!raw) return "";
  const parts = raw.split(/(\s+|\/|,|-)/);
  const tokensToRemove = new Set<string>(
    (LANGUAGE_CANONICAL[lang] || []).map((token) => removeDiacritics(token).toLowerCase())
  );
  tokensToRemove.add(removeDiacritics(lang).toLowerCase());

  const cleaned = parts
    .map((part) => {
      if (!part) return "";
      if (/^\s+$/.test(part) || part === "/" || part === "," || part === "-") return part;
      const normalized = tokenize(part)[0];
      if (normalized && tokensToRemove.has(normalized)) return "";
      return part;
    })
    .join("")
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*-\s*/g, " - ")
    .replace(/^[,./-\s]+/, "")
    .replace(/[,./-\s]+$/, "")
    .trim();

  return prettifyAccent(cleaned);
}

/** Convierte el listado crudo en pares normalizados Idioma/Acento */
function parseLangAccents(value: string): Pair[] {
  if (!value) return [];

  const chunks = toArray(value).map((s) => s.trim()).filter(Boolean);

  const result: Pair[] = [];
  const seen = new Set<string>();
  let lastLang: string | null = null;

  for (const chunk of chunks) {
    const hyphenMatch = chunk.match(/^\s*(.+?)\s*[-–—]\s*(.+)\s*$/);
    const rawLang = hyphenMatch ? hyphenMatch[1].trim() : "";
    const rawAccent = hyphenMatch ? hyphenMatch[2].trim() : "";

    let lang: string | null = null;
    lang =
      detectLanguageFromTokens(tokenize(rawLang)) ||
      detectLanguageFromTokens(tokenize(chunk)) ||
      (hyphenMatch ? detectLanguageFromTokens(tokenize(rawAccent)) : null) ||
      lastLang ||
      detectLanguageFromTokens(tokenize(`${rawLang} ${rawAccent}`)) ||
      null;

    if (!lang) {
      lang = UNKNOWN_LANGUAGE;
    }

    const accentSource = hyphenMatch ? rawAccent : chunk;
    let accent = cleanupAccent(accentSource, lang);
    if (!accent && hyphenMatch) {
      accent = cleanupAccent(rawLang, lang);
    }
    if (!accent && !hyphenMatch) {
      accent = cleanupAccent(chunk, lang);
    }

    const key = `${lang}|${accent.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ lang, accent });
    }
    lastLang = lang;
  }

  return result;
}


function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function splitList(value: string) {
  if (!value) return [];
  return toArray(value).map((s) => s.trim()).filter(Boolean);
}

function formatFilterLabel(label: string) {
  if (!label) return "";
  return label.replace(/\s*\/\s*/g, " / ");
}

/* =========================
   Componente principal
========================= */
export default function Home() {
  /* -------- Estado base -------- */
  const [locutores, setLocutores] = useState<Locutor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();
  const [sortBy, setSortBy] = useState<"relevance" | "name" | "recent">("relevance");
  const [greetName, setGreetName] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/voces/client/me", { cache: "no-store" });
        const j = await r.json();
        const raw = j?.client?.name || j?.client?.email || "";
        const first = getFirstName(String(raw).split("@")[0] || "");
        if (first) setGreetName(first.charAt(0).toUpperCase() + first.slice(1));
      } catch {}
    })();
  }, []);
  const formatSelectedLabel = (count: number, emptyLabel: string) =>
    count ? t("selectedCount").replace("{count}", String(count)) : emptyLabel;

  /* -------- Fetch con Early Return -------- */
  useEffect(() => {
    let cancelled = false;

    async function fetchLocutores() {
      setCargando(true);
      setError(null);

      try {
        const res = await fetch("/api/voces/locutores", { cache: "no-store" });

        if (!res.ok) {
          setError(`Error HTTP ${res.status}`);
          setCargando(false);
          return; // EARLY RETURN
        }

        const data = await res.json().catch(() => null);
        if (!data || !data.ok || !Array.isArray(data.locutores)) {
          setError("La API no devolvió el formato esperado.");
          setCargando(false);
          return; // EARLY RETURN
        }

        // Normalizamos datos
        const normalizados: (Locutor & { slug: string })[] = data.locutores.map((l: any, i: number) => {
          const safeFoto = AVATAR_PLACEHOLDER;

           const safeDemo =
             l.demo && typeof l.demo === "string" ? normalizeDemoUrl(l.demo) : "";

          const name = (l.nombre ?? "").toString();
          const id = typeof l.id === "string" && l.id ? l.id : `tmp-${i}`;
          const idPart = typeof l.code === "number" ? String(l.code) : id;
          const slug = makeLocutorSlug(name, idPart);

          return {
             id,
             nombre: l.nombre ?? "",
             idioma: l.idioma ?? "",
             genero: l.genero ?? "",
             estilo: l.estilo ?? "",
             edad: l.edad ?? "",
             foto: safeFoto,
             demo: safeDemo,
             pais: l.pais ?? "",
             code: typeof l.code === "number" ? l.code : undefined,
            slug,
          };
         });

        if (!cancelled) setLocutores(normalizados);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Error desconocido");
      } finally {
        if (!cancelled) setCargando(false);
      }
    }

    fetchLocutores();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cierre global de popovers de filtros con click afuera o Escape
  useEffect(() => {
    function closeDetailsByIds(ids: string[]) {
      ids.forEach((id) => {
        const el = document.getElementById(id) as HTMLDetailsElement | null;
        if (el) el.removeAttribute("open");
      });
    }
    const onDocClick = (e: MouseEvent) => {
      const ids = ["estilo-dropdown", "edad-dropdown"];
      ids.forEach((id) => {
        const el = document.getElementById(id) as HTMLDetailsElement | null;
        if (el && el.open && e.target instanceof Node && !el.contains(e.target)) {
          el.removeAttribute("open");
        }
      });
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetailsByIds(["estilo-dropdown", "edad-dropdown"]);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  /* -------- Filtros -------- */
  const [busqueda, setBusqueda] = useState("");
  const [fIdioma, setFIdioma] = useState("");      // solo lenguaje (Spanish, English, etc.)
  const [fAcento, setFAcento] = useState("");      // dependencia de fIdioma
  const [fGenero, setFGenero] = useState("");
  const [fPais, setFPais] = useState("");

  const [fEstilos, setFEstilos] = useState<string[]>([]);
  const [tmpEstilos, setTmpEstilos] = useState<string[]>([]);

  const [fEdades, setFEdades] = useState<string[]>([]);
  const [tmpEdades, setTmpEdades] = useState<string[]>([]);

  // Opciones Idioma
  const idiomasOpts = useMemo(() => {
    const s = new Set<string>();
    for (const l of locutores) {
      for (const p of parseLangAccents(l.idioma)) s.add(p.lang);
    }
    return Array.from(s).sort();
  }, [locutores]);

  // Opciones Acento (dependen de idioma)
  // Antes devolvía [] cuando !fIdioma: ahora devuelve la unión de todos los acentos si no hay idioma seleccionado
  const acentosOpts = useMemo(() => {
  const s = new Set<string>();
  for (const l of locutores) {
    for (const p of parseLangAccents(l.idioma)) {
      if (!p.accent) continue;                 // ignora acentos vacíos
      if (!fIdioma || p.lang === fIdioma) {
        s.add(p.accent);
      }
    }
  }
  return Array.from(s).sort();
}, [locutores, fIdioma]);


  // Géneros
  const generosOpts = useMemo(() => {
    const s = new Set<string>();
    for (const l of locutores) if (l.genero) s.add(l.genero);
    return Array.from(s).sort();
  }, [locutores]);

  // Estilos
  const estilosOpts = useMemo(() => {
    const s = new Set<string>();
    for (const l of locutores) for (const e of splitList(l.estilo)) s.add(e);
    return Array.from(s).sort();
  }, [locutores]);

  // Edades
  const edadesOpts = useMemo(() => {
    const s = new Set<string>();
    for (const l of locutores) for (const e of splitList(l.edad)) s.add(e);
    return Array.from(s).sort();
  }, [locutores]);

  // Países
  const paisesOpts = useMemo(() => {
    const s = new Set<string>();
    for (const l of locutores) {
      const country = asText(l.pais).trim();
      if (country) s.add(country);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [locutores]);

  // Reset
  const resetFiltros = () => {
    setBusqueda("");
    setFIdioma("");
    setFAcento("");
    setFGenero("");
    setFPais("");
    setFEstilos([]);
    setTmpEstilos([]);
    setFEdades([]);
    setTmpEdades([]);
  };
  const hayFiltrosActivos = !!(
    busqueda ||
    fIdioma ||
    fAcento ||
    fGenero ||
    fPais ||
    fEstilos.length ||
    fEdades.length
  );

  // Aplicar filtros
  const filtrados = useMemo(() => {
    const q = busqueda.trim();

    return locutores.filter((l) => {
      const nameOK = !q || fuzzyMatch(l.nombre || "", q);

      const pairs = parseLangAccents(l.idioma);
      const idiomaOK = fIdioma ? pairs.some((p) => p.lang === fIdioma) : true;
      const acentoOK = fAcento
        ? pairs.some((p) => p.lang === fIdioma && p.accent === fAcento)
        : true;

      const generoOK = fGenero ? l.genero === fGenero : true;

      const estilosLocutor = splitList(l.estilo);
      const estilosOK = fEstilos.length
        ? fEstilos.some((e) => estilosLocutor.includes(e))
        : true;

      const edadesLocutor = splitList(l.edad);
      const edadesOK = fEdades.length
        ? fEdades.some((e) => edadesLocutor.includes(e))
        : true;

      const paisOK = fPais ? asText(l.pais).trim() === fPais : true;

      return nameOK && idiomaOK && acentoOK && generoOK && estilosOK && edadesOK && paisOK;
    });
  }, [locutores, busqueda, fIdioma, fAcento, fGenero, fPais, fEstilos, fEdades]);

  const activeChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    if (busqueda) chips.push({ label: `"${busqueda}"`, onRemove: () => setBusqueda("") });
    if (fIdioma) chips.push({ label: fIdioma, onRemove: () => { setFIdioma(""); setFAcento(""); } });
    if (fAcento) chips.push({ label: fAcento, onRemove: () => setFAcento("") });
    if (fGenero) chips.push({ label: fGenero, onRemove: () => setFGenero("") });
    if (fPais) chips.push({ label: fPais, onRemove: () => setFPais("") });
    for (const e of fEstilos) chips.push({ label: formatFilterLabel(e), onRemove: () => setFEstilos((prev) => prev.filter((x) => x !== e)) });
    for (const e of fEdades) chips.push({ label: formatFilterLabel(e), onRemove: () => setFEdades((prev) => prev.filter((x) => x !== e)) });
    return chips;
  }, [busqueda, fIdioma, fAcento, fGenero, fPais, fEstilos, fEdades]);

  const sorted = useMemo(() => {
    if (sortBy === "name") {
      return [...filtrados].sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", { sensitivity: "base" }));
    }
    if (sortBy === "recent") {
      return [...filtrados].sort((a, b) => (Number(b.code || 0) - Number(a.code || 0)));
    }
    return filtrados;
  }, [filtrados, sortBy]);

  /* =========================
     UI
  ========================= */
  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ borderBottom: "0.5px solid var(--color-border-default)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top left, rgba(232,76,43,0.08) 0%, transparent 60%)" }} />
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16 relative">
          {greetName && (
            <p
              className="mb-3 text-[22px] md:text-[26px] leading-none"
              style={{
                fontFamily: "var(--font-dm-serif, serif)",
                fontStyle: "italic",
                fontWeight: 400,
                color: "var(--color-text-secondary)",
              }}
            >
              Hola, {greetName}
            </p>
          )}
          <div className="inline-flex items-center gap-2 mb-5 rounded-full px-3 py-1" style={{ background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.20)" }}>
            <span className="w-1.5 h-1.5 rounded-full dot-pulse" style={{ background: "var(--color-accent)" }} />
            <span className="text-[11px] font-[500] tracking-widest uppercase" style={{ color: "var(--color-accent)" }}>Sivar Music</span>
          </div>
          <h1 className="text-[38px] md:text-[56px] leading-none tracking-[-0.02em]" style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
            {t("headerTitle")}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed max-w-lg" style={{ color: "var(--color-text-secondary)" }}>
            {t("headerSubtitle")}
          </p>
        </div>
      </div>

      {/* Filters + Results */}
      <section className="mx-auto max-w-6xl px-4 mt-6">
        {/* Search bar */}
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

        {/* Horizontal filter pills */}
        <div className="flex items-center gap-2 pb-2 mb-4">
          {/* Scrollable select-based filters */}
          <div className="flex items-center gap-2 overflow-x-auto min-w-0" style={{ scrollbarWidth: "none" }}>
            {/* Idioma */}
            <div className="relative shrink-0">
              <select
                value={fIdioma}
                onChange={(e) => { setFIdioma(e.target.value); setFAcento(""); }}
                className={`ds-pill appearance-none pr-6 [color-scheme:dark]${fIdioma ? " active" : ""}`}
              >
                <option value="">{t("language")}</option>
                {idiomasOpts.map((op) => <option key={op} value={op}>{op}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "var(--color-text-muted)" }} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>

            {/* Acento */}
            {acentosOpts.length > 0 && (
              <div className="relative shrink-0">
                <select
                  value={fAcento}
                  onChange={(e) => setFAcento(e.target.value)}
                  className={`ds-pill appearance-none pr-6 [color-scheme:dark]${fAcento ? " active" : ""}`}
                >
                  <option value="">{t("accent")}</option>
                  {acentosOpts.map((op) => <option key={op} value={op}>{op}</option>)}
                </select>
                <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "var(--color-text-muted)" }} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {/* Género */}
            <div className="relative shrink-0">
              <select
                value={fGenero}
                onChange={(e) => setFGenero(e.target.value)}
                className={`ds-pill appearance-none pr-6 [color-scheme:dark]${fGenero ? " active" : ""}`}
              >
                <option value="">{t("gender")}</option>
                {generosOpts.map((op) => <option key={op} value={op}>{op}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "var(--color-text-muted)" }} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>

            {/* País */}
            <div className="relative shrink-0">
              <select
                value={fPais}
                onChange={(e) => setFPais(e.target.value)}
                className={`ds-pill appearance-none pr-6 [color-scheme:dark]${fPais ? " active" : ""}`}
              >
                <option value="">{t("location")}</option>
                {paisesOpts.map((op) => <option key={op} value={op}>{op}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "var(--color-text-muted)" }} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Estilo - fuera del contenedor overflow para que el dropdown no quede recortado */}
          <details
            id="estilo-dropdown"
            className="group relative shrink-0"
            onToggle={(event) => { const el = event.currentTarget as HTMLDetailsElement; if (el.open) setTmpEstilos(fEstilos); }}
          >
            <summary
              className={`ds-pill cursor-pointer${fEstilos.length > 0 ? " active" : ""}`}
              style={{ listStyle: "none" }}
            >
              {fEstilos.length > 0 ? t("selectedCount").replace("{count}", String(fEstilos.length)) : t("style")}
              <svg className="inline-block ml-1 w-3 h-3 transition-transform duration-200 group-open:-rotate-180" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--color-text-muted)" }}>
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </summary>
            <div className="absolute left-0 z-20 mt-2 w-72 rounded-[12px] overflow-hidden shadow-2xl" style={{ background: "rgba(18,18,20,0.98)", border: "0.5px solid var(--color-border-default)" }}>
              <div className="max-h-64 overflow-auto px-4 py-3">
                <div className="flex flex-col gap-2">
                  {estilosOpts.map((op) => (
                    <label key={op} className="flex items-start gap-2.5 text-[13px] cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>
                      <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded" style={{ accentColor: "var(--color-accent)" }} checked={tmpEstilos.includes(op)} onChange={() => setTmpEstilos((prev) => toggleInList(prev, op))} />
                      <span className="flex-1 break-words leading-tight">{formatFilterLabel(op)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 px-4 py-2.5" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
                <button onClick={() => { setTmpEstilos([]); setFEstilos([]); const el = document.getElementById("estilo-dropdown") as HTMLDetailsElement | null; if (el) el.removeAttribute("open"); }} className="ds-btn-secondary text-[12px] py-1.5 px-3">{t("clear")}</button>
                <button onClick={() => { setFEstilos(tmpEstilos); const el = document.getElementById("estilo-dropdown") as HTMLDetailsElement | null; if (el) el.removeAttribute("open"); }} className="ds-btn-primary text-[12px] py-1.5 px-3">{t("apply")}</button>
              </div>
            </div>
          </details>

          {/* Edad */}
          <details
            id="edad-dropdown"
            className="group relative shrink-0"
            onToggle={(event) => { const el = event.currentTarget as HTMLDetailsElement; if (el.open) setTmpEdades(fEdades); }}
          >
            <summary
              className={`ds-pill cursor-pointer${fEdades.length > 0 ? " active" : ""}`}
              style={{ listStyle: "none" }}
            >
              {fEdades.length > 0 ? t("selectedCount").replace("{count}", String(fEdades.length)) : t("ageRange")}
              <svg className="inline-block ml-1 w-3 h-3 transition-transform duration-200 group-open:-rotate-180" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--color-text-muted)" }}>
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </summary>
            <div className="absolute left-0 z-20 mt-2 w-72 rounded-[12px] overflow-hidden shadow-2xl" style={{ background: "rgba(18,18,20,0.98)", border: "0.5px solid var(--color-border-default)" }}>
              <div className="max-h-64 overflow-auto px-4 py-3">
                <div className="flex flex-col gap-2">
                  {edadesOpts.map((op) => (
                    <label key={op} className="flex items-start gap-2.5 text-[13px] cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>
                      <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded" style={{ accentColor: "var(--color-accent)" }} checked={tmpEdades.includes(op)} onChange={() => setTmpEdades((prev) => toggleInList(prev, op))} />
                      <span className="flex-1 break-words leading-tight">{formatFilterLabel(op)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 px-4 py-2.5" style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
                <button onClick={() => { setTmpEdades([]); setFEdades([]); const el = document.getElementById("edad-dropdown") as HTMLDetailsElement | null; if (el) el.removeAttribute("open"); }} className="ds-btn-secondary text-[12px] py-1.5 px-3">{t("clear")}</button>
                <button onClick={() => { setFEdades(tmpEdades); const el = document.getElementById("edad-dropdown") as HTMLDetailsElement | null; if (el) el.removeAttribute("open"); }} className="ds-btn-primary text-[12px] py-1.5 px-3">{t("apply")}</button>
              </div>
            </div>
          </details>

          {hayFiltrosActivos && (
            <button
              onClick={resetFiltros}
              className="shrink-0 text-[12px] font-[500] px-3 py-1.5 rounded-full transition-colors duration-200"
              style={{ color: "var(--color-accent)", background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.20)" }}
            >
              {t("clearFilters")}
            </button>
          )}
        </div>

        {/* Active chips + Sort bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-2">
            {activeChips.length > 0 ? activeChips.map((chip) => (
              <button
                key={chip.label}
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1.5 rounded-full text-[12px] font-[500] px-2.5 py-1 transition-colors duration-200"
                style={{ background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.20)", color: "var(--color-accent)" }}
              >
                <span className="truncate max-w-[8rem]">{chip.label}</span>
                <span>×</span>
              </button>
            )) : (
              <span className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
                {sorted.length} {sorted.length === 1 ? "resultado" : "resultados"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {activeChips.length > 0 && (
              <span className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
                {sorted.length} resultado{sorted.length !== 1 ? "s" : ""}
              </span>
            )}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="ds-pill appearance-none pr-6 [color-scheme:dark]"
              >
                <option value="relevance">Relevancia</option>
                <option value="name">Nombre</option>
                <option value="recent">Recientes</option>
              </select>
              <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "var(--color-text-muted)" }} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.138l3.71-3.907a.75.75 0 111.08 1.04l-4.25 4.475a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Results grid */}
        {cargando ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-24 md:pb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="ds-card flex flex-col overflow-hidden"
                style={{ animation: `softPulse 1.6s ease-in-out ${i * 80}ms infinite` }}
              >
                <div className="h-[140px]" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.04), rgba(255,255,255,0.02))" }}>
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-[72px] h-[72px] rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm" style={{ background: "rgba(255,255,255,0.06)" }} />
                    <div className="h-3 rounded flex-1 max-w-[60%]" style={{ background: "rgba(255,255,255,0.06)" }} />
                  </div>
                  <div className="flex gap-1.5">
                    <div className="h-4 w-20 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
                    <div className="h-4 w-8 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
                  </div>
                  <div className="h-3 rounded w-[85%]" style={{ background: "rgba(255,255,255,0.04)" }} />
                  <div className="h-[42px] rounded-[9px] mt-1" style={{ background: "rgba(255,255,255,0.04)" }} />
                  <div className="h-9 rounded-lg mt-1" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-center py-16 text-[14px]" style={{ color: "var(--color-accent)" }}>{t("error")}: {error}</p>
        ) : sorted.length === 0 ? (
          <p className="text-center py-16 text-[14px]" style={{ color: "var(--color-text-muted)" }}>{t("noResults")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-24 md:pb-8">
            {sorted.map((l, idx) => {
              const displayName = getFirstName(l.nombre) || l.nombre;
              const flag = countryToFlag(l.pais);
              const countryName = asText(l.pais).trim();
              const flagLabel = countryName ? t("flagOf").replace("{country}", countryName) : t("flag");
              const langPairs = parseLangAccents(l.idioma);
              const primary = langPairs[0];
              const primaryPieces = primary ? [primary.lang, primary.accent].filter(Boolean) : [];
              const primaryLabel = primaryPieces.length
                ? primaryPieces.join(primaryPieces.length > 1 ? " - " : "")
                : asText(l.idioma).trim();
              const extraCount = langPairs.length > 1 ? langPairs.length - 1 : 0;
              const generoLabel = asText(l.genero).trim();
              const estilosLabel = toArray(l.estilo).join(", ");
              const edadesLabel = toArray(l.edad).join(", ");
              const traitsLabel = [generoLabel, estilosLabel, edadesLabel].filter(Boolean).join(" · ");
              return (
                <article
                  key={`${l.nombre}-${idx}`}
                  className="ds-card relative flex flex-col overflow-hidden card-enter"
                  style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}
                >
                  <AddToProject item={{ type: "locutor", nombre: l.nombre, idioma: l.idioma, genero: l.genero, estilo: l.estilo, edad: l.edad, demo: l.demo, pais: l.pais }} />
                  {/* Avatar area */}
                  <a href={`/voces/locutor/${(l as any).slug}`} className="block">
                    <div
                      className="h-[140px] flex items-center justify-center"
                      style={{ background: "linear-gradient(to bottom, rgba(232,76,43,0.08), rgba(255,255,255,0.02))" }}
                    >
                      <img
                        src={AVATAR_PLACEHOLDER}
                        alt={displayName}
                        className="w-[72px] h-[72px] rounded-full object-cover"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.10)" }}
                      />
                    </div>
                  </a>
                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {flag && (
                        <a href={l.pais ? `/voces/location/${slugifyName(l.pais)}` : "#"} className="text-base shrink-0" role="img" aria-label={flagLabel} title={l.pais || undefined}>
                          {flag}
                        </a>
                      )}
                      <a
                        href={`/voces/locutor/${(l as any).slug}`}
                        className="text-[16px] font-[500] leading-tight truncate hover:opacity-80 transition-opacity"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {displayName}
                      </a>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <span
                        className="inline-block text-[11px] font-[500] px-2 py-0.5 rounded-[5px]"
                        style={{ background: "rgba(232,76,43,0.10)", border: "0.5px solid rgba(232,76,43,0.25)", color: "var(--color-accent)" }}
                      >
                        {primaryLabel || t("noPrimaryLanguage")}
                      </span>
                      {extraCount > 0 && (
                        <span
                          className="inline-block text-[11px] font-[500] px-2 py-0.5 rounded-[5px]"
                          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-muted)" }}
                        >
                          +{extraCount}
                        </span>
                      )}
                    </div>
                    {traitsLabel && (
                      <p className="text-[12px] leading-snug line-clamp-2 mb-3" style={{ color: "var(--color-text-muted)" }}>
                        {traitsLabel}
                      </p>
                    )}
                    <AudioPlayer src={l.demo} ariaLabel={t("demoOf").replace("{name}", displayName)} trackName={displayName} />
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <a href={`/voces/locutor/${(l as any).slug}`} className="ds-btn-primary flex-1 text-center text-[13px]">
                        {t("viewProfile")}
                      </a>
                      <span className="text-[11px] shrink-0" style={{ color: "var(--color-text-muted)" }}>#{l.code ?? "—"}</span>
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
