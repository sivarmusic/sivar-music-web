"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/voces/components/AuthContext";
import AudioPlayer from "@/app/voces/components/AudioPlayer";
import { makeLocutorSlug } from "@/lib/voces-slug";

// Ported from voces-bds's app/admin/cantantes/casting/candidates/[id]/page.tsx.
//  - Auth: /api/auth/me -> useAuth(), self-gated, redirects to /voces/login
//    (same convention as app/voces/admin/cantantes/casting/page.tsx, the
//    already-ported sibling page in this batch).
//  - Casting lookup: /api/cantantes/casting?id= -> /api/voces/admin/cantantes/casting/get?shareId=
//    (admin route already built in this batch, mirrors how the locutor-side
//    app/voces/admin/casting/candidates/[id]/page.tsx resolves its casting).
//  - Cantantes: /api/cantantes -> /api/voces/cantantes.
//  - Links: /admin/cantantes/casting -> /voces/admin/cantantes/casting,
//    /cantante/[slug] -> /voces/cantante/[slug].

type Cantante = {
  id: string;
  nombre: string;
  pais?: string;
  idioma: string[];
  estilo: string[];
  demo?: string;
  email?: string;
  phone?: string;
  slug: string;
};

type Criteria = {
  styles?: string[];
  country?: string;
  gender?: string;
  vocalRange?: string;
};

export default function CantantesCandidatesPage() {
  const { id } = useParams(); // shareId del casting
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [casting, setCasting] = useState<any | null>(null);
  const [cantantes, setCantantes] = useState<Cantante[]>([]);
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
        const [r1, r2] = await Promise.all([
          fetch(`/api/voces/admin/cantantes/casting/get?shareId=${id}`, { cache: "no-store" }),
          fetch("/api/voces/cantantes", { cache: "no-store" }),
        ]);
        const [j1, j2] = await Promise.all([r1.json(), r2.json()]);
        if (!r1.ok || !j1?.ok) throw new Error(j1?.error || "Casting no encontrado");
        if (!r2.ok || !j2?.ok) throw new Error(j2?.error || "Error cargando cantantes");
        setCasting(j1.casting);
        const normalized = (j2.cantantes || []).map((c: any) => ({
          id: c.id,
          nombre: c.nombre ?? "",
          pais: c.pais,
          idioma: typeof c.idioma === "string" ? c.idioma.split(",").map((s: string) => s.trim()).filter(Boolean) : Array.isArray(c.idioma) ? c.idioma : [],
          estilo: typeof c.estilo === "string" ? c.estilo.split(",").map((s: string) => s.trim()).filter(Boolean) : Array.isArray(c.estilo) ? c.estilo : [],
          demo: c.demo,
          email: c.email,
          phone: c.phone,
          slug: makeLocutorSlug(c.nombre ?? "", c.id ?? ""),
        })) as Cantante[];
        setCantantes(normalized);
      } catch (e: any) {
        setError(e?.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isAdmin]);

  const candidatos = useMemo(() => {
    const crit: Criteria = casting?.criteria || {};
    return cantantes.filter((c) => {
      const stylesOK = crit.styles?.length ? crit.styles.some((s) => c.estilo.includes(s)) : true;
      const paisOK = crit.country ? c.pais === crit.country : true;
      return stylesOK && paisOK;
    });
  }, [casting?.criteria, cantantes]);

  const visible = useMemo(() => {
    let list = candidatos.filter((c) => selected[`__hidden__${c.id}`] !== true);
    if (statusFilter === "selected") list = list.filter((c) => !!selected[c.id]);
    if (statusFilter === "review") list = list.filter((c) => !selected[c.id]);
    return list;
  }, [candidatos, selected, statusFilter]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => !k.startsWith("__hidden__") && selected[k]), [selected]);
  const allVisibleIds = useMemo(() => visible.map((c) => c.id), [visible]);

  function toggle(id: string) { setSelected((p) => ({ ...p, [id]: !p[id] })); }
  function selectAll(on: boolean) { setSelected((p) => { const n = { ...p }; for (const id of allVisibleIds) n[id] = on; return n; }); }

  function copyEmails() {
    const list = selectedIds.length ? visible.filter((c) => selectedIds.includes(c.id)) : visible;
    const emails = list.map((c) => c.email).filter(Boolean).join(", ");
    if (!emails) { setToast("No hay emails"); setTimeout(() => setToast(null), 2000); return; }
    navigator.clipboard.writeText(emails).then(() => { setToast("Emails copiados"); setTimeout(() => setToast(null), 2500); });
  }

  function downloadCSV() {
    const list = selectedIds.length ? visible.filter((c) => selectedIds.includes(c.id)) : visible;
    if (!list.length) return;
    const esc = (v: any) => { const s = (v ?? "").toString(); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = list.map((c) => [esc(c.nombre), esc(c.email || ""), esc(c.phone || ""), esc(c.idioma.join(", ")), esc(c.estilo.join(", ")), esc(c.pais || ""), esc(c.demo || "")].join(","));
    const csv = ["Nombre,Email,Teléfono,Idioma,Estilo,País,Demo URL", ...rows].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = `candidatos_cantantes_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  if (authLoading || !isAdmin) return <main className="p-6">Cargando…</main>;

  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <a href="/voces/admin/cantantes/casting" className="text-[12px] hover:opacity-80" style={{ color: "var(--color-text-muted)" }}>← Castings</a>
            <h1 className="text-[20px] font-[500] mt-1" style={{ color: "var(--color-text-primary)" }}>Posibles candidatos — Cantantes</h1>
            {casting && <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Proyecto: {casting.title || "Sin título"}</p>}
          </div>
        </div>

        {/* Barra de acciones */}
        <div className="mt-4 flex flex-wrap items-center gap-3 mb-6">
          <label className="inline-flex items-center gap-2 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            <input type="checkbox" checked={allVisibleIds.length > 0 && allVisibleIds.every((id) => selected[id])} onChange={(e) => selectAll(e.currentTarget.checked)} className="h-3.5 w-3.5" style={{ accentColor: "#644cc8" }} />
            Seleccionar todo
          </label>
          <button className="ds-btn-secondary text-[12px] py-1.5 px-3" onClick={downloadCSV}>Exportar CSV</button>
          <button className="ds-btn-secondary text-[12px] py-1.5 px-3" onClick={copyEmails}>Copiar emails</button>
          <button className={`text-[12px] py-1.5 px-3 rounded-full border transition-colors ${selectedIds.length ? "border-red-400/40 text-red-400" : "border-white/10 text-white/30 cursor-not-allowed"}`} disabled={!selectedIds.length}
            onClick={() => setSelected((p) => { const n = { ...p }; for (const id of selectedIds) { n[id] = false; n[`__hidden__${id}`] = true; } return n; })}>Quitar de la vista</button>
          <button className="ds-btn-secondary text-[12px] py-1.5 px-3" onClick={() => setSelected({})}>Restablecer</button>
          <div className="ml-auto flex items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="ds-pill [color-scheme:dark] appearance-none">
              <option value="all">Todos</option>
              <option value="review">En revisión</option>
              <option value="selected">Seleccionados</option>
            </select>
            {selectedIds.length > 0 && <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>{selectedIds.length} seleccionados</span>}
          </div>
        </div>

        {loading ? (
          <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>Cargando…</p>
        ) : error ? (
          <p className="text-[13px]" style={{ color: "var(--color-accent)" }}>{error}</p>
        ) : visible.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>No hay cantantes que coincidan con los criterios del casting.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((c) => (
              <article key={c.id} className={`rounded-[14px] p-4 transition-colors ${selected[c.id] ? "ring-1 ring-[#644cc8]/60" : ""}`}
                style={{ background: selected[c.id] ? "rgba(100,76,200,0.05)" : "rgba(255,255,255,0.03)", border: `0.5px solid ${selected[c.id] ? "rgba(100,76,200,0.30)" : "var(--color-border-default)"}` }}>
                <div className="flex items-start justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>
                    <input type="checkbox" checked={!!selected[c.id]} onChange={() => toggle(c.id)} className="h-3.5 w-3.5" style={{ accentColor: "#644cc8" }} />
                    Seleccionar
                  </label>
                  <span className={`text-[11px] rounded-full px-2 py-0.5 ${selected[c.id] ? "text-emerald-400" : "text-white/40"}`} style={{ background: selected[c.id] ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)" }}>
                    {selected[c.id] ? "Seleccionado" : "En revisión"}
                  </span>
                </div>
                <div className="mt-2 text-[14px] font-[500]" style={{ color: "var(--color-text-primary)" }}>
                  <a href={`/voces/cantante/${c.slug}`} className="hover:opacity-80 transition-opacity">{c.nombre}</a>
                </div>
                <div className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{c.pais} · {c.estilo.join(", ")}</div>
                {c.demo && <div className="mt-3"><AudioPlayer src={c.demo} ariaLabel={`Demo de ${c.nombre}`} /></div>}
                <div className="mt-3 flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setRating((p) => ({ ...p, [c.id]: n }))} className={`text-sm ${rating[c.id] >= n ? "text-yellow-400" : "text-white/20"}`}>★</button>
                  ))}
                  {rating[c.id] ? <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{rating[c.id]}/5</span> : null}
                </div>
                <textarea value={notes[c.id] || ""} onChange={(e) => setNotes((p) => ({ ...p, [c.id]: e.target.value }))} placeholder="Notas internas…" rows={2}
                  className="mt-2 w-full rounded-lg px-3 py-2 text-[12px] resize-none focus:outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-secondary)" }} />
                <a href={`/voces/cantante/${c.slug}`} className="mt-2 inline-block text-[11px] underline" style={{ color: "#644cc8" }}>Ver perfil</a>
              </article>
            ))}
          </div>
        )}
      </div>
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-3 py-2 rounded-md shadow-lg z-[120]">{toast}</div>}
    </main>
  );
}
