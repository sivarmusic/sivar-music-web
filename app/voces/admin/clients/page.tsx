"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/app/voces/components/I18n";
import { useAuth } from "@/app/voces/components/AuthContext";
import { countryToFlag } from "@/lib/voces-country";
import { makeLocutorSlug } from "@/lib/voces-slug";
import { asText, toArray } from "@/lib/voces-arrays";
import { normalizeForSearch } from "@/lib/voces-text";

// Ported from voces-bds's app/admin/clients/page.tsx.
//  - Auth: /api/auth/me (master-password admin) -> useAuth() (isAdmin derived
//    from voces_clients.is_admin via /api/voces/client/me), self-gated
//    client-side like the original, redirecting to /voces/login instead of
//    just showing "admins only" inline.
//  - API routes: /api/client/list, /api/client/delete, /api/client/register,
//    /api/client/set-admin, /api/client/reset-password, /api/admin/locutores,
//    /api/admin/reel-requests -> mirrored under /api/voces/...
//  - Dropped the GenerarReporteButton (admin/reportes) import/section: that
//    page is out of this batch's scope (casting-management batch).
//  - Locutor/location links: /locutor/[slug], /location/[slug] -> /voces/...

type AdminLocutor = {
  id: string;
  nombre: string;
  idioma: string;
  genero: string;
  estilo: string;
  edad: string;
  demo: string;
  foto: string;
  visible: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  pais?: string;
  code?: number;
};

type SortKey = "name" | "language" | "visibility" | "created" | "updated";
type SortDir = "asc" | "desc";

function SortableTh({
  label, sortKeyValue, align, widthClass, sortKey, sortDir, onClick, thClass, thStyle,
}: {
  label: string;
  sortKeyValue: SortKey;
  align: "left" | "right";
  widthClass?: string;
  sortKey: SortKey;
  sortDir: SortDir;
  onClick: (key: SortKey) => void;
  thClass: string;
  thStyle: React.CSSProperties;
}) {
  const isActive = sortKey === sortKeyValue;
  const arrow = isActive ? (sortDir === "asc" ? "↑" : "↓") : "";
  const alignClass = align === "right" ? "text-right" : "text-left";
  return (
    <th className={`${thClass} ${alignClass} ${widthClass || ""}`} style={thStyle}>
      <button
        type="button"
        onClick={() => onClick(sortKeyValue)}
        className={`inline-flex items-center gap-1 select-none transition-colors ${align === "right" ? "flex-row-reverse" : ""}`}
        style={{ color: isActive ? "var(--color-text-primary)" : "var(--color-text-muted)", cursor: "pointer" }}
      >
        <span>{label}</span>
        <span className="text-[10px] opacity-70" style={{ minWidth: "0.6rem" }}>{arrow}</span>
      </button>
    </th>
  );
}

const NEW_LOCUTOR_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 3;
const AVATAR_PLACEHOLDER = "/avatar-placeholder.svg";

function formatTimeAgo(iso: string | null) {
  if (!iso) return "Sin fecha";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const divisions: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.34524, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" },
  ];
  let duration = diffSeconds;
  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) return rtf.format(-Math.round(duration), division.unit);
    duration = duration / division.amount;
  }
  return rtf.format(-Math.round(duration), "year");
}

export default function AdminClientsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [locutores, setLocutores] = useState<AdminLocutor[]>([]);
  const [locutoresLoading, setLocutoresLoading] = useState(true);
  const [locutoresError, setLocutoresError] = useState<string | null>(null);
  const [savingLocutorId, setSavingLocutorId] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [q, setQ] = useState("");
  const [fVis, setFVis] = useState<"all" | "visible" | "hidden">("all");
  const [fLang, setFLang] = useState<string>("all");
  const [fCountry, setFCountry] = useState<string>("all");
  const [pendingReelCount, setPendingReelCount] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/voces/login");
  }, [authLoading, isAdmin, router]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "language" ? "asc" : "desc");
    }
  }

  const locutoresSorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    const cmpStr = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base" });
    const ts = (s: string | null | undefined) => (s ? new Date(s).getTime() : 0);
    return [...locutores].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return cmpStr(a.nombre || "", b.nombre || "") * dirMul;
        case "language":
          return cmpStr(a.idioma || "", b.idioma || "") * dirMul;
        case "visibility":
          return ((a.visible ? 1 : 0) - (b.visible ? 1 : 0)) * dirMul;
        case "updated":
          return (ts(a.updatedAt) - ts(b.updatedAt)) * dirMul;
        case "created":
        default:
          return (ts(a.createdAt) - ts(b.createdAt)) * dirMul;
      }
    });
  }, [locutores, sortKey, sortDir]);

  function parseLanguages(field: string): string[] {
    if (!field) return [];
    const chunks = toArray(field).map((s) => s.trim()).filter(Boolean);
    const langs = new Set<string>();
    for (const c of chunks) {
      const left = c.split(/[-–—]/)[0]?.trim();
      if (left) langs.add(left);
    }
    return Array.from(langs);
  }

  const langOptions = useMemo(() => {
    const s = new Set<string>();
    for (const l of locutores) for (const L of parseLanguages(l.idioma)) s.add(L);
    return Array.from(s).sort();
  }, [locutores]);

  const countryOptions = useMemo(() => {
    const s = new Set<string>();
    for (const l of locutores) {
      const country = asText(l.pais).trim();
      if (country) s.add(country);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [locutores]);

  const locutoresFiltered = useMemo(() => {
    const qn = normalizeForSearch(q.trim());
    return locutoresSorted.filter((l) => {
      if (fVis !== "all") { const want = fVis === "visible"; if (!!l.visible !== want) return false; }
      if (fLang !== "all") { const langs = parseLanguages(l.idioma); if (!langs.includes(fLang)) return false; }
      if (fCountry !== "all") { const country = asText(l.pais).trim(); if (country !== fCountry) return false; }
      if (qn) { const haystack = normalizeForSearch(`${l.nombre} ${l.idioma} ${l.genero} ${l.estilo} ${l.edad} ${l.pais}`); if (!haystack.includes(qn)) return false; }
      return true;
    });
  }, [locutoresSorted, q, fVis, fLang, fCountry]);

  useEffect(() => { setLimit(10); }, [q, fVis, fLang, fCountry, locutores.length]);

  const visibleLocutoresCount = useMemo(() => locutores.filter((l) => l.visible).length, [locutores]);
  const pendingLocutores = useMemo(() => locutores.filter((l) => !l.visible), [locutores]);

  useEffect(() => {
    if (isAdmin) {
      refreshClients();
      refreshLocutores();
      refreshPendingReelCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function refreshClients() {
    setClientsLoading(true);
    try {
      const res = await fetch("/api/voces/client/list", { cache: "no-store" });
      const j = await res.json();
      if (j?.ok) setClients(j.clients || []);
    } finally { setClientsLoading(false); }
  }

  async function refreshPendingReelCount() {
    try {
      const res = await fetch("/api/voces/admin/reel-requests?status=pending", { cache: "no-store" });
      const j = await res.json();
      if (res.ok && j?.ok) setPendingReelCount((j.requests || []).length);
    } catch {}
  }

  async function refreshLocutores() {
    setLocutoresLoading(true);
    setLocutoresError(null);
    try {
      const res = await fetch("/api/voces/admin/locutores", { cache: "no-store" });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) { setLocutoresError(j?.error || "No se pudo cargar la lista"); return; }
      setLocutores(j.locutores || []);
    } catch (err: any) {
      setLocutoresError(err?.message || "No se pudo cargar la lista");
    } finally { setLocutoresLoading(false); }
  }

  async function updateLocutorVisibility(id: string, visible: boolean, nombre?: string) {
    const prevVisible = locutores.find((l) => l.id === id)?.visible;
    setLocutoresError(null);
    setSavingLocutorId(id);
    setLocutores((current) => current.map((l) => (l.id === id ? { ...l, visible } : l)));
    try {
      const res = await fetch("/api/voces/admin/locutores", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, visible, nombre }) });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "No se pudo guardar");
    } catch (err: any) {
      setLocutoresError(err?.message || "No se pudo actualizar el estado");
      setLocutores((current) => current.map((l) => l.id === id ? { ...l, visible: prevVisible ?? l.visible } : l));
    } finally { setSavingLocutorId(null); }
  }

  async function del(id: string) {
    if (!confirm("Delete client?")) return;
    const r = await fetch("/api/voces/client/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const j = await r.json();
    if (j?.ok) refreshClients();
  }

  async function resetPassword(id: string) {
    const p = prompt("New password");
    if (!p) return;
    const r = await fetch("/api/voces/client/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, password: p }) });
    const j = await r.json();
    if (j?.ok) alert("Password updated");
  }

  const createClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/voces/client/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name, password }) });
    const j = await res.json();
    setMsg(j?.ok ? "Cliente creado" : (j?.error || "Error"));
    if (j?.ok) refreshClients();
  };

  if (authLoading || !isAdmin) return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }}>
      <p className="p-6 text-[13px]" style={{ color: "var(--color-text-muted)" }}>{t("adminOnly")}</p>
    </main>
  );

  const sectionClass = "rounded-[16px] p-6";
  const sectionStyle = { background: "var(--color-bg-card)", border: "0.5px solid var(--color-border-default)" };
  const thClass = "py-2 pr-4 text-[11px] font-[600] uppercase tracking-wider";
  const thStyle = { color: "var(--color-text-muted)" };

  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-8">

      {/* Create client */}
      <div className={`max-w-xl mx-auto ${sectionClass}`} style={sectionStyle}>
        <h1 className="text-[18px] font-[500] mb-5" style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
          {t("adminCreateClient")}
        </h1>
        {msg && (
          <p className="text-[13px] mb-4 px-3 py-2.5 rounded-[8px]"
            style={msg === "Cliente creado"
              ? { color: "#4ade80", background: "rgba(74,222,128,0.06)", border: "0.5px solid rgba(74,222,128,0.20)" }
              : { color: "var(--color-accent)", background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.20)" }
            }>
            {msg}
          </p>
        )}
        <form onSubmit={createClient} className="space-y-3">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("email")} className="ds-input [color-scheme:dark]" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("nameOptional")} className="ds-input [color-scheme:dark]" />
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("password")}
              className="ds-input pr-14 [color-scheme:dark]"
            />
            <button type="button" onClick={() => setShowPass((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-[500]"
              style={{ color: "var(--color-text-muted)" }}>
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
          <button type="submit" className="ds-btn-primary text-[13px] py-2 px-5">{t("create")}</button>
        </form>
      </div>

      {/* Clients table */}
      <div className={`max-w-4xl mx-auto mt-6 ${sectionClass}`} style={sectionStyle}>
        <h2 className="text-[15px] font-[500] mb-5" style={{ color: "var(--color-text-primary)" }}>{t("clientsTitle")}</h2>
        {clientsLoading ? (
          <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--color-text-muted)" }}>
            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            {t("loading")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  <th className={thClass} style={thStyle}>{t("email")}</th>
                  <th className={thClass} style={thStyle}>{t("name")}</th>
                  <th className={thClass} style={thStyle}>{t("created")}</th>
                  <th className={thClass} style={thStyle}>Admin</th>
                  <th className={thClass} style={thStyle}>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
                    <td className="py-3 pr-4" style={{ color: "var(--color-text-primary)" }}>{c.email}</td>
                    <td className="py-3 pr-4" style={{ color: "var(--color-text-secondary)" }}>{c.name || ""}</td>
                    <td className="py-3 pr-4 whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{c.createdAt?.slice(0, 10) || ""}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-[500]"
                        style={c.isAdmin
                          ? { background: "rgba(74,222,128,0.08)", border: "0.5px solid rgba(74,222,128,0.20)", color: "#4ade80" }
                          : { background: "var(--color-bg-subtle)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-muted)" }
                        }>
                        {c.isAdmin ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/voces/client/set-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, isAdmin: !c.isAdmin }) });
                              const j = await res.json();
                              if (res.ok && j?.ok) setClients((prev) => prev.map((x) => x.id === c.id ? { ...x, isAdmin: !c.isAdmin } : x));
                            } catch {}
                          }}
                          className="ds-btn-secondary text-[11px] py-0.5 px-2.5"
                        >
                          {c.isAdmin ? "Quitar admin" : "Hacer admin"}
                        </button>
                        <button onClick={() => resetPassword(c.id)} className="ds-btn-secondary text-[11px] py-0.5 px-2.5">
                          {t("resetPass")}
                        </button>
                        <button onClick={() => del(c.id)} className="ds-btn-secondary text-[11px] py-0.5 px-2.5"
                          style={{ color: "var(--color-accent)", borderColor: "rgba(232,76,43,0.25)" }}>
                          {t("delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[13px]" style={{ color: "var(--color-text-muted)" }}>{t("noClients")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Locutores panel */}
      <div id="locutores" className={`max-w-6xl mx-auto mt-6 ${sectionClass}`} style={sectionStyle}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-5">
          <div>
            <h2 className="text-[15px] font-[500]" style={{ color: "var(--color-text-primary)" }}>Perfiles de locutores</h2>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Activá o desactivá qué perfiles se muestran en la página pública.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
              {visibleLocutoresCount}/{locutores.length} visibles
            </span>
            <a href="/voces/admin/reel-requests" className="ds-btn-secondary text-[11px] py-1 px-3 inline-flex items-center gap-1.5">
              Solicitudes de actualización
              {pendingReelCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-[600]"
                  style={{ background: "var(--color-accent)", color: "#fff" }}>
                  {pendingReelCount}
                </span>
              )}
            </a>
            <a href="/voces/admin/casting" className="ds-btn-secondary text-[11px] py-1 px-3">Castings</a>
            <a href="/voces/registro" target="_blank" className="ds-btn-secondary text-[11px] py-1 px-3">Formulario registro</a>
            <button onClick={refreshLocutores} disabled={locutoresLoading} className="ds-btn-secondary text-[11px] py-1 px-3 disabled:opacity-50">
              Actualizar
            </button>
          </div>
        </div>

        {pendingLocutores.length > 0 && (
          <div className="mb-4 rounded-[10px] px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
            style={{ background: "rgba(232,76,43,0.06)", border: "0.5px solid rgba(232,76,43,0.18)" }}>
            <p className="text-[13px]" style={{ color: "var(--color-accent)" }}>
              Hay <strong>{pendingLocutores.length}</strong> perfil(es) nuevos para revisar (ocultos por defecto).
            </p>
            <button
              type="button"
              onClick={() => {
                setFVis("hidden");
                document.getElementById("locutores-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="ds-btn-secondary text-[11px] py-0.5 px-3"
            >Ver lista</button>
          </div>
        )}

        {pendingReelCount > 0 && (
          <div className="mb-4 rounded-[10px] px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
            style={{ background: "rgba(232,76,43,0.06)", border: "0.5px solid rgba(232,76,43,0.18)" }}>
            <p className="text-[13px]" style={{ color: "var(--color-accent)" }}>
              Hay <strong>{pendingReelCount}</strong> solicitud(es) de actualización de perfil pendientes de aprobación.
            </p>
            <a href="/voces/admin/reel-requests" className="ds-btn-secondary text-[11px] py-0.5 px-3">Revisar</a>
          </div>
        )}

        {/* Filters */}
        <div id="locutores-list" className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 scroll-mt-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, idioma, estilo…" className="ds-input [color-scheme:dark]" />
          <select value={fVis} onChange={(e) => setFVis(e.target.value as any)} className="ds-input [color-scheme:dark]">
            <option value="all">Todos (visibilidad)</option>
            <option value="visible">Solo visibles</option>
            <option value="hidden">Solo ocultos</option>
          </select>
          <select value={fLang} onChange={(e) => setFLang(e.target.value)} className="ds-input [color-scheme:dark]">
            <option value="all">Todos los idiomas</option>
            {langOptions.map((op) => <option key={op} value={op}>{op}</option>)}
          </select>
          <select value={fCountry} onChange={(e) => setFCountry(e.target.value)} className="ds-input [color-scheme:dark]">
            <option value="all">Todos los países</option>
            {countryOptions.map((op) => <option key={op} value={op}>{op}</option>)}
          </select>
        </div>

        {locutoresLoading ? (
          <div className="flex items-center gap-2 py-6 text-[13px]" style={{ color: "var(--color-text-muted)" }}>
            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            {t("loading")}
          </div>
        ) : (
          <>
            {locutoresError && (
              <p className="mb-4 text-[13px] px-3 py-2.5 rounded-[8px]"
                style={{ color: "var(--color-accent)", background: "rgba(232,76,43,0.08)", border: "0.5px solid rgba(232,76,43,0.20)" }}>
                {locutoresError}
              </p>
            )}
            {locutoresFiltered.length === 0 ? (
              <p className="py-6 text-[13px]" style={{ color: "var(--color-text-muted)" }}>Todavía no hay perfiles para revisar.</p>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] table-auto">
                    <thead>
                      <tr>
                        <SortableTh label="Perfil" sortKeyValue="name" align="left" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} thClass={thClass} thStyle={thStyle} />
                        <SortableTh label="Idiomas" sortKeyValue="language" align="left" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} thClass={thClass} thStyle={thStyle} />
                        <SortableTh label="Visibilidad" sortKeyValue="visibility" align="left" widthClass="w-36" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} thClass={thClass} thStyle={thStyle} />
                        <SortableTh label="Actualizado" sortKeyValue="updated" align="right" widthClass="w-40" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} thClass={thClass} thStyle={thStyle} />
                        <SortableTh label="Agregado" sortKeyValue="created" align="right" widthClass="w-40" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} thClass={thClass} thStyle={thStyle} />
                      </tr>
                    </thead>
                    <tbody>
                      {locutoresFiltered.slice(0, limit).map((l) => {
                        const createdAtMs = l.createdAt ? new Date(l.createdAt).getTime() : null;
                        const isNew = createdAtMs ? Date.now() - createdAtMs < NEW_LOCUTOR_THRESHOLD_MS : false;
                        const fullName = l.nombre || "Sin nombre";
                        const flag = countryToFlag(l.pais);
                        const idPart = typeof l.code === "number" ? String(l.code) : l.id;
                        const slug = makeLocutorSlug(fullName, idPart);
                        return (
                          <tr key={l.id} style={{ borderTop: "0.5px solid var(--color-border-default)" }}>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-3">
                                <a href={`/voces/locutor/${slug}`} className="shrink-0">
                                  <img src={AVATAR_PLACEHOLDER} alt={fullName} className="h-10 w-10 rounded-full object-cover"
                                    style={{ border: "0.5px solid var(--color-border-default)" }} />
                                </a>
                                <div>
                                  <p className="font-[500] flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                                    {flag ? (
                                      <a href={l.pais ? `/voces/location/${(l.pais || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "")}` : "#"}
                                        className="text-base" role="img" aria-label={l.pais ? `Bandera de ${l.pais}` : "Bandera"} title={l.pais || undefined}>
                                        {flag}
                                      </a>
                                    ) : null}
                                    <a href={`/voces/locutor/${slug}`} className="truncate inline-block max-w-[18rem] align-bottom transition-colors"
                                      style={{ color: "var(--color-text-primary)" }}
                                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
                                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}>
                                      {fullName}
                                    </a>
                                  </p>
                                  <p className="text-[11px] line-clamp-1 max-w-[28rem]" style={{ color: "var(--color-text-muted)" }}>
                                    {[l.genero, l.estilo, l.edad].filter(Boolean).join(" • ")}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-4 align-top">
                              <div className="line-clamp-1" style={{ color: "var(--color-text-secondary)" }}>{l.idioma || "—"}</div>
                            </td>
                            <td className="py-3 whitespace-nowrap align-middle">
                              <button
                                onClick={() => updateLocutorVisibility(l.id, !l.visible, fullName)}
                                disabled={savingLocutorId === l.id}
                                className="rounded-full px-4 py-1 text-[11px] font-[500] transition-all"
                                style={l.visible
                                  ? { background: "rgba(74,222,128,0.08)", border: "0.5px solid rgba(74,222,128,0.20)", color: "#4ade80" }
                                  : { background: "var(--color-bg-subtle)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-muted)" }
                                }
                              >
                                {savingLocutorId === l.id ? "Guardando…" : l.visible ? "Visible" : "Oculto"}
                              </button>
                            </td>
                            <td className="py-3 whitespace-nowrap text-right align-middle">
                              <span style={{ color: "var(--color-text-muted)", opacity: l.updatedAt ? 1 : 0.5 }}>
                                {l.updatedAt ? formatTimeAgo(l.updatedAt) : "—"}
                              </span>
                            </td>
                            <td className="py-3 whitespace-nowrap text-right align-middle">
                              <div className="inline-flex items-center gap-2">
                                <span style={{ color: "var(--color-text-muted)" }}>{formatTimeAgo(l.createdAt)}</span>
                                {isNew && !l.visible && (
                                  <span className="rounded-full px-2 py-0.5 text-[10px] font-[600]"
                                    style={{ background: "var(--color-accent-bg)", border: "0.5px solid var(--color-accent-border)", color: "var(--color-accent)" }}>
                                    Nuevo
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {locutoresFiltered.length > limit && (
                  <div className="mt-5 flex justify-center">
                    <button onClick={() => setLimit((n) => n + 10)} className="ds-btn-secondary text-[12px] py-2 px-5">
                      Ver más
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
