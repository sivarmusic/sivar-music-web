"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AudioPlayer from "@/app/voces/components/AudioPlayer";
import DemoPlayer from "@/app/voces/components/DemoPlayer";
import Breadcrumbs from "@/app/voces/components/Breadcrumbs";
import { getFirstName } from "@/lib/voces-names";
import { countryToFlag } from "@/lib/voces-country";
import { useI18n } from "@/app/voces/components/I18n";
import { makeLocutorSlug } from "@/lib/voces-slug";
import { VOICE_GROUP_ORDER } from "@/lib/voces-voice";
import { useAuth } from "@/app/voces/components/AuthContext";
import MoverACastingModal from "@/app/voces/components/proyecto/MoverACastingModal";

const AVATAR_PLACEHOLDER = "/avatar-placeholder.svg";

// Clave para identificar un mismo integrante y evitar duplicados en el proyecto.
function itemKey(it: any): string {
  return it?.cantanteId || (it?.nombre || "").trim().toLowerCase();
}

// Colapsa integrantes repetidos (mismo cantante agregado más de una vez).
function dedupeItems(items: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const it of items || []) {
    const k = itemKey(it);
    if (k && seen.has(k)) continue;
    if (k) seen.add(k);
    out.push(it);
  }
  return out;
}

export default function ProyectoDetallePage() {
  const { id } = useParams();
  const [pl, setPl] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [cantanteDemos, setCantanteDemos] = useState<{ byId: Record<string, string>; byName: Record<string, string> }>({ byId: {}, byName: {} });
  const [cantanteVoices, setCantanteVoices] = useState<{ byId: Record<string, string>; byName: Record<string, string> }>({ byId: {}, byName: {} });
  const [removing, setRemoving] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const { t } = useI18n();
  const { isAdmin } = useAuth();

  // Selección de integrantes para copiar a un resultado de casting (solo admin).
  const selKey = (it: any) => it.id || itemKey(it);
  const toggleSel = (it: any) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const k = selKey(it);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  // Memoizado: ref estable mientras no cambie la selección o los items, para no
  // resetear la elección de casting del modal en re-renders del padre.
  const selectedItems = useMemo(
    () => dedupeItems(pl?.items || []).filter((it: any) => selected.has(selKey(it))),
    [pl, selected]
  );

  async function removeItem(it: any) {
    if (!pl) return;
    const displayName = getFirstName(it.nombre) || it.nombre;
    if (!confirm(`¿Eliminar a ${displayName} del proyecto?`)) return;
    const itemId = it.id;
    const index = (pl.items || []).indexOf(it);
    setRemoving(itemId || String(index));
    try {
      const res = await fetch("/api/voces/playlist/remove-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId: String(id), itemId, index }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "No se pudo eliminar");
      // Preservamos category (remove-item no la devuelve) y solo refrescamos items.
      setPl((prev: any) => (prev ? { ...prev, items: j.playlist?.items ?? prev.items } : prev));
      setToast("Integrante eliminado");
      setTimeout(() => setToast(null), 2500);
    } catch (e: any) {
      setError(e?.message || "No se pudo eliminar");
    } finally {
      setRemoving(null);
    }
  }

  // Los demos de cantantes se resuelven en vivo (no del snapshot guardado),
  // porque se suben después de armar el proyecto.
  useEffect(() => {
    if (!pl?.items?.some((it: any) => it.type === "cantante")) return;
    (async () => {
      try {
        const res = await fetch("/api/voces/cantantes", { cache: "no-store" });
        const j = await res.json().catch(() => null);
        if (!j?.ok) return;
        const byId: Record<string, string> = {};
        const byName: Record<string, string> = {};
        const vById: Record<string, string> = {};
        const vByName: Record<string, string> = {};
        for (const c of j.cantantes || []) {
          const nameKey = (c.nombre || "").trim().toLowerCase();
          if (c.demo) {
            byId[c.id] = c.demo;
            byName[nameKey] = c.demo;
          }
          if (c.tipoVoz) {
            vById[c.id] = c.tipoVoz;
            vByName[nameKey] = c.tipoVoz;
          }
        }
        setCantanteDemos({ byId, byName });
        setCantanteVoices({ byId: vById, byName: vByName });
      } catch {}
    })();
  }, [pl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/voces/playlist/by-id?id=${id}`, { cache: "no-store" });
        const j = await res.json().catch(() => null);
        if (!res.ok || !j?.ok) throw new Error(j?.error || "Error");
        if (!cancelled) setPl(j.playlist);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const voiceOf = (it: any): string => {
    const key = (it.nombre || "").trim().toLowerCase();
    return cantanteVoices.byId[it.cantanteId] ?? cantanteVoices.byName[key] ?? "Otros";
  };

  const renderItem = (it: any, i: number) => {
    const key = it.id || `${i}`;
    const displayName = getFirstName(it.nombre) || it.nombre;
    const flag = countryToFlag(it.pais);
    const flagLabel = it.pais ? `Bandera de ${it.pais}` : "Bandera";
    const base = it.type === "cantante" ? "/voces/cantante/" : "/voces/locutor/";
    const slug = base + makeLocutorSlug(it.nombre || "", it.cantanteId || "");
    const demoSrc = it.type === "cantante"
      ? (cantanteDemos.byId[it.cantanteId] ?? cantanteDemos.byName[(it.nombre || "").trim().toLowerCase()] ?? it.demo)
      : it.demo;
    return (
      <li key={key} className={`relative bg-white border rounded-xl p-4 ${selected.has(selKey(it)) ? "border-brand-500 ring-1 ring-brand-500" : "border-gray-100"}`}>
        {isAdmin ? (
          <label
            className="absolute top-2 left-2 z-10 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm cursor-pointer"
            title="Seleccionar para copiar a casting"
            onClick={(e) => e.stopPropagation()}
          >
            <input type="checkbox" checked={selected.has(selKey(it))} onChange={() => toggleSel(it)} className="accent-brand-600 w-4 h-4" />
          </label>
        ) : null}
        {isAdmin ? (
          <button
            onClick={() => removeItem(it)}
            disabled={removing === (it.id || "")}
            aria-label={`Eliminar a ${displayName}`}
            title="Eliminar del proyecto"
            className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-500 shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7m-7 0l.7 11.2A1.5 1.5 0 009.9 20h4.2a1.5 1.5 0 001.5-1.4L16 7" />
            </svg>
          </button>
        ) : null}
        <a href={slug} className="block w-max mb-2" title="Ver perfil">
          <img src={AVATAR_PLACEHOLDER} alt={displayName} className="w-16 h-16 rounded-full object-cover" />
        </a>
        <div className="font-semibold text-gray-900 flex items-center gap-2">
          {flag ? <span className="text-lg" role="img" aria-label={flagLabel}>{flag}</span> : null}
          <a href={slug} className="hover:text-brand-600" title="Ver perfil">{displayName}</a>
        </div>
        <div className="text-sm text-gray-600">{it.genero} • {it.estilo}</div>
        {it.type === "cantante"
          ? <DemoPlayer src={demoSrc} ariaLabel={`Demo de ${displayName}`} />
          : <AudioPlayer src={demoSrc} ariaLabel={`Demo de ${displayName}`} />}
      </li>
    );
  };

  return (
    <>
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <Breadcrumbs items={[{ label: "My projects", href: pl?.category === "cantante" ? "/voces/cantantes/proyectos" : "/voces/listas" }, { label: pl?.name || "Proyecto" }]} className="text-blue-700 mb-2 px-1" />
        {loading ? (
          <p className="text-sm text-gray-600">Cargando…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !pl ? (
          <p className="text-sm text-gray-600">Proyecto no disponible</p>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-3">
              <img src="/SMG PNG.png" alt="Sivar Music" className="h-10 w-auto" />
              <h1 className="text-2xl font-bold text-gray-900">{pl.name}</h1>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={async () => {
                    setSharing(true);
                    setCopied(false);
                    try {
                      const res = await fetch("/api/voces/playlist/share", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ playlistId: String(id) }),
                      });
                      const j = await res.json().catch(() => null);
                      if (!res.ok || !j?.ok) throw new Error(j?.error || "Error");
                      const full = typeof window !== "undefined" ? `${location.origin}${j.url}` : j.url;
                      setShareUrl(full);
                      setToast("Link generado");
                      setTimeout(() => setToast(null), 2500);
                    } catch (e: any) {
                      setError(e?.message || "Error");
                    } finally {
                      setSharing(false);
                    }
                  }}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
                    sharing
                      ? "bg-brand-300 text-white opacity-70 cursor-not-allowed"
                      : "bg-brand-600 hover:bg-brand-700 text-white shadow"
                  }`}
                  title={t("share")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-6 0L21 3m0 0h-7.5M21 3v7.5" />
                  </svg>
                  <span>{sharing ? t("sharing") : t("share")}</span>
                </button>
                {shareUrl ? (
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      className="border border-gray-300 bg-white text-gray-900 rounded px-2 py-1 text-sm w-64"
                      value={shareUrl}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(shareUrl);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                          setToast("Copiado al portapapeles");
                          setTimeout(() => setToast(null), 2500);
                        } catch {}
                      }}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      {copied ? t("copied") : t("copyLink")}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            {(!pl.items || pl.items.length === 0) ? (
              <p className="text-sm text-gray-500">Aún no hay integrantes en este proyecto.</p>
            ) : pl.category === "cantante" ? (
              VOICE_GROUP_ORDER.map((group) => {
                const groupItems = dedupeItems(pl.items || []).filter((it: any) => voiceOf(it) === group);
                if (!groupItems.length) return null;
                return (
                  <section key={group} className="mb-10">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-baseline gap-2.5">
                      {group}
                      <span className="text-lg font-medium text-gray-400">{groupItems.length}</span>
                    </h2>
                    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupItems.map((it: any, i: number) => renderItem(it, i))}
                    </ul>
                  </section>
                );
              })
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dedupeItems(pl.items || []).map((it: any, i: number) => renderItem(it, i))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
    {isAdmin && selected.size > 0 ? (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] flex items-center gap-3 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg">
        <span>{selected.size} seleccionado{selected.size === 1 ? "" : "s"}</span>
        <button onClick={() => setMoveOpen(true)} className="px-3 py-1 rounded-full bg-brand-600 hover:bg-brand-700">Copiar a casting</button>
        <button onClick={() => setSelected(new Set())} className="text-gray-300 hover:text-white">Limpiar</button>
      </div>
    ) : null}
    {toast ? (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-3 py-2 rounded-md shadow-lg z-[120]">{toast}</div>
    ) : null}
    <MoverACastingModal
      open={moveOpen}
      onClose={() => setMoveOpen(false)}
      items={selectedItems}
      onDone={(msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
        setSelected(new Set());
      }}
    />
    </>
  );
}
