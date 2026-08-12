"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";
import AudioPlayer from "@/app/voces/components/AudioPlayer";
import { makeLocutorSlug } from "@/lib/voces-slug";
import Breadcrumbs from "@/app/voces/components/Breadcrumbs";
import { toArray } from "@/lib/voces-arrays";

// Ported from voces-bds's app/admin/casting/candidates/[id]/page.tsx.
//  - Auth: /api/auth/me -> useAuth(), self-gated, redirects to /voces/login.
//  - Casting lookup: /api/casting?id= (public route, out of this batch's
//    scope) -> /api/voces/admin/casting/get?shareId= (admin route already
//    built in this batch — consistent with this page living under
//    app/voces/admin/*).
//  - Locutores: /api/locutores -> /api/voces/locutores.
//  - Share: /api/admin/candidates/share -> /api/voces/admin/candidates/share.
//  - Links: /admin/casting -> /voces/admin/casting, /locutor/[slug] -> /voces/locutor/[slug].

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
  slug?: string;
  email?: string;
  phone?: string;
};

type Criteria = {
  language?: string;
  accent?: string;
  gender?: string;
  styles?: string[];
  ages?: string[];
};

type Pair = { lang: string; accent: string };
function splitList(value: string) {
  if (!value) return [] as string[];
  return toArray(value).map((s) => s.trim()).filter(Boolean);
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

export default function CandidatesForCastingPage() {
  const { id } = useParams(); // shareId del casting
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [casting, setCasting] = useState<any | null>(null);
  const [locutores, setLocutores] = useState<Locutor[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "selected" | "review">("all");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rating, setRating] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/voces/login");
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const r1 = await fetch(`/api/voces/admin/casting/get?shareId=${id}`, { cache: "no-store" });
        const j1 = await r1.json();
        if (!r1.ok || !j1?.ok) throw new Error(j1?.error || "Casting no encontrado");
        setCasting(j1.casting);
        const r2 = await fetch("/api/voces/locutores", { cache: "no-store" });
        const j2 = await r2.json();
        if (!r2.ok || !j2?.ok) throw new Error(j2?.error || "Error cargando locutores");
        const normalized = (j2.locutores || []).map((l: any, i: number) => {
          const lid = typeof l.id === "string" && l.id ? l.id : `tmp-${i}`;
          const idPart = typeof l.code === "number" ? String(l.code) : lid;
          return { ...l, id: lid, slug: makeLocutorSlug(l.nombre ?? "", idPart) } as Locutor;
        });
        setLocutores(normalized);
      } catch (e: any) {
        setError(e?.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isAdmin]);

  const candidatos = useMemo(() => {
    const crit: Criteria = casting?.criteria || {};
    if (!locutores.length) return [] as Locutor[];
    return locutores.filter((l) => {
      const pairs = parseLangAccentsSimple(String(l.idioma || ""));
      const langOK = crit.language ? pairs.some((p) => p.lang === crit.language) : true;
      const accentOK = crit.accent
        ? pairs.some((p) => p.lang === (crit.language || p.lang) && p.accent === crit.accent)
        : true;
      const generoOK = crit.gender ? String(l.genero || "") === crit.gender : true;
      const estilosOK = Array.isArray(crit.styles) && crit.styles.length
        ? (() => { const set = new Set(splitList(l.estilo || "")); return crit.styles!.some((s) => set.has(s)); })()
        : true;
      const edadesOK = Array.isArray(crit.ages) && crit.ages.length
        ? (() => { const set = new Set(splitList(l.edad || "")); return crit.ages!.some((s) => set.has(s)); })()
        : true;
      return langOK && accentOK && generoOK && estilosOK && edadesOK;
    });
  }, [casting?.criteria, locutores]);

  const visible = useMemo(() => {
    let list = candidatos.filter((l) => selected[`__hidden__${l.id}`] !== true);
    if (statusFilter === "selected") list = list.filter((l) => !!selected[l.id]);
    if (statusFilter === "review") list = list.filter((l) => !selected[l.id]);
    return list;
  }, [candidatos, selected, statusFilter]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => !k.startsWith("__hidden__") && selected[k]), [selected]);
  const allVisibleIds = useMemo(() => visible.map((l) => l.id), [visible]);

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  function selectAllVisible(on: boolean) {
    setSelected((prev) => {
      const next = { ...prev } as Record<string, boolean>;
      for (const id of allVisibleIds) next[id] = on;
      return next;
    });
  }

  async function shareSelected() {
    const ids = selectedIds;
    if (!ids.length) return;
    try {
      const items = visible.filter((l) => ids.includes(l.id)).map((l) => ({
        nombre: l.nombre,
        idioma: l.idioma,
        genero: l.genero,
        estilo: l.estilo,
        edad: l.edad,
        demo: l.demo,
        pais: l.pais,
      }));
      const name = `Candidatos - ${casting?.title || ""}`.trim();
      const r = await fetch("/api/voces/admin/candidates/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, items }) });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Error al compartir");
      const url = j?.url || `/voces/s/${j?.shareId}`;
      try { await navigator.clipboard.writeText(location.origin + url); setToast("Link copiado"); setTimeout(() => setToast(null), 2000); } catch {}
      window.open(url, "_blank");
    } catch (e: any) {
      setToast(e?.message || "Error");
      setTimeout(() => setToast(null), 2500);
    }
  }

  function removeSelectedFromView() {
    const ids = selectedIds;
    if (!ids.length) return;
    setSelected((prev) => {
      const next = { ...prev } as Record<string, boolean>;
      for (const id of ids) {
        next[id] = false;
        next[`__hidden__${id}`] = true;
      }
      return next;
    });
  }

  function copyEmails() {
    const list = selectedIds.length ? visible.filter((l) => selectedIds.includes(l.id)) : visible;
    const emails = list.map((l) => l.email).filter(Boolean) as string[];
    if (!emails.length) {
      setToast("No hay emails para copiar");
      setTimeout(() => setToast(null), 2500);
      return;
    }
    navigator.clipboard.writeText(emails.join(", ")).then(() => {
      setToast(`${emails.length} email${emails.length !== 1 ? "s" : ""} copiado${emails.length !== 1 ? "s" : ""} al portapapeles`);
      setTimeout(() => setToast(null), 3000);
    }).catch(() => {
      setToast("No se pudo copiar al portapapeles");
      setTimeout(() => setToast(null), 3000);
    });
  }

  function downloadCSV() {
    const list = selectedIds.length ? visible.filter((l) => selectedIds.includes(l.id)) : visible;
    if (!list.length) return;
    const header = ["Nombre", "Email", "Teléfono", "Idioma", "Género", "Estilo", "Rango de edad", "País", "Demo URL"];
    const escape = (v: any) => {
      const s = (v ?? "").toString();
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const rows = list.map((l) => [
      escape(l.nombre), escape(l.email || ""), escape(l.phone || ""), escape(l.idioma),
      escape(l.genero), escape(l.estilo), escape(l.edad), escape(l.pais || ""), escape(l.demo),
    ].join(","));
    const csv = [header.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const safeTitle = String(casting?.title || "casting").replace(/[^a-z0-9_-]+/gi, "_");
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidatos_${safeTitle}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (authLoading || !isAdmin) return <main className="p-6">Cargando…</main>;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <Breadcrumbs
          items={[{ label: "Castings", href: "/voces/admin/casting" }, { label: "Posibles candidatos" }]}
          className="text-blue-700 mb-2 px-1"
        />
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Posibles candidatos</h1>
          <a href="/voces/admin/casting" className="text-sm underline text-gray-700">Volver a castings</a>
        </div>
        {casting ? (
          <p className="mt-1 text-sm text-gray-600">Proyecto: <span className="font-medium text-gray-900">{casting.title || "Sin título"}</span></p>
        ) : null}
        {/* Barra de acciones */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={allVisibleIds.length > 0 && allVisibleIds.every((id) => selected[id])}
              onChange={(e) => selectAllVisible(e.currentTarget.checked)}
            />
            Seleccionar todo
          </label>
          <button
            className={`text-sm rounded px-3 py-1.5 ${selectedIds.length ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
            disabled={!selectedIds.length}
            onClick={shareSelected}
          >Compartir seleccionados</button>
          <button
            className={"text-sm rounded px-3 py-1.5 border border-green-300 text-green-700 hover:bg-green-50"}
            onClick={downloadCSV}
          >Exportar a Excel (CSV)</button>
          <button
            className="inline-flex items-center gap-1.5 text-sm rounded px-3 py-1.5 border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100"
            onClick={copyEmails}
            title={selectedIds.length ? "Copia los emails de los seleccionados" : "Copia los emails de todos los candidatos visibles"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
              <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
            </svg>
            Copiar emails
          </button>
          <button
            className={`text-sm rounded px-3 py-1.5 ${selectedIds.length ? "border border-red-300 text-red-700 hover:bg-red-50" : "border border-gray-200 text-gray-400 cursor-not-allowed"}`}
            disabled={!selectedIds.length}
            onClick={removeSelectedFromView}
          >Eliminar de la vista</button>
          <button
            className="text-sm rounded px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={() => setSelected({})}
          >Restablecer lista</button>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs uppercase tracking-wide text-gray-400">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-9 rounded-full border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700"
            >
              <option value="all">Todos</option>
              <option value="review">En revisión</option>
              <option value="selected">Seleccionados</option>
            </select>
          </div>
          {selectedIds.length ? (
            <span className="text-sm text-gray-500">{selectedIds.length} seleccionados</span>
          ) : null}
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-gray-600">Cargando…</p>
        ) : error ? (
          <p className="mt-6 text-sm text-red-600">{error}</p>
        ) : (
          <section className="mt-6">
            {visible.length === 0 ? (
              <p className="text-sm text-gray-600">No hay coincidencias con los filtros definidos para este casting.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visible.map((l) => (
                  <article key={l.id} className={`rounded-2xl border ${selected[l.id] ? "border-blue-400 ring-2 ring-blue-200" : "border-gray-200"} bg-white p-4 shadow-sm`}>
                    <div className="flex items-start justify-between gap-2">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={!!selected[l.id]} onChange={() => toggle(l.id)} />
                        Seleccionar
                      </label>
                      <span className={`text-[11px] rounded-full px-2 py-0.5 ${selected[l.id] ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                        {selected[l.id] ? "Seleccionado" : "En revisión"}
                      </span>
                    </div>
                    <div className="mt-2 font-semibold text-gray-900">
                      {l.slug ? (
                        <a href={`/voces/locutor/${l.slug}`} className="hover:text-brand-600 underline-offset-2 hover:underline">{l.nombre}</a>
                      ) : (
                        l.nombre
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{l.genero} • {l.estilo} • {l.edad}</div>
                    <div className="mt-2">
                      <AudioPlayer src={l.demo} ariaLabel={`Demo de ${l.nombre}`} />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setRating((prev) => ({ ...prev, [l.id]: n }))}
                          className={`text-sm ${rating[l.id] >= n ? "text-yellow-500" : "text-gray-300"}`}
                          title={`Puntaje ${n}`}
                        >
                          ★
                        </button>
                      ))}
                      <span className="text-xs text-gray-400">{rating[l.id] ? `${rating[l.id]}/5` : "Sin score"}</span>
                    </div>
                    <div className="mt-3">
                      <textarea
                        value={notes[l.id] || ""}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [l.id]: e.target.value }))}
                        placeholder="Notas internas…"
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        rows={2}
                      />
                    </div>
                    {l.slug ? (
                      <div className="mt-3">
                        <a href={`/voces/locutor/${l.slug}`} className="text-xs text-blue-700 underline">Ver perfil</a>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
      {toast ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-3 py-2 rounded-md shadow-lg z-[120]">{toast}</div>
      ) : null}
    </main>
  );
}
