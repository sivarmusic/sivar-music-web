"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getFirstName } from "@/lib/voces-names";
import { countryToFlag } from "@/lib/voces-country";
import AudioPlayer from "@/app/voces/components/AudioPlayer";
import DemoPlayer from "@/app/voces/components/DemoPlayer";
import { VOICE_GROUP_ORDER } from "@/lib/voces-voice";

// Ported from voces-bds's app/s/[id]/page.tsx: public "shared playlist" view
// (the /voces/s/{shareId} link produced by app/api/voces/playlist/share).
// No auth: /voces/s/ is proxy-allowlisted for anonymous visitors, and this
// page doesn't gate on useAuth(). Logo swap BDS -> Sivar Music, same
// convention as the rest of this batch.
const AVATAR_PLACEHOLDER = "/avatar-placeholder.svg";

export default function SharedPlaylistPage() {
  const { id } = useParams();
  const [pl, setPl] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cantanteDemos, setCantanteDemos] = useState<{ byId: Record<string, string>; byName: Record<string, string> }>({ byId: {}, byName: {} });
  const [cantanteVoices, setCantanteVoices] = useState<{ byId: Record<string, string>; byName: Record<string, string> }>({ byId: {}, byName: {} });

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/voces/playlist/share?id=${id}`);
      const j = await res.json();
      if (j?.ok) setPl(j.playlist); else setError(j?.error || "No disponible");
    })();
  }, [id]);

  // Demos y tipo de voz de cantantes en vivo (se cargan después de armar el proyecto).
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

  const voiceOf = (it: any): string => {
    const key = (it.nombre || "").trim().toLowerCase();
    return cantanteVoices.byId[it.cantanteId] ?? cantanteVoices.byName[key] ?? "Otros";
  };

  const renderItem = (it: any, i: number) => {
    const displayName = getFirstName(it.nombre) || it.nombre;
    const flag = countryToFlag(it.pais);
    const flagLabel = it.pais ? `Bandera de ${it.pais}` : "Bandera";
    const demoSrc = it.type === "cantante"
      ? (cantanteDemos.byId[it.cantanteId] ?? cantanteDemos.byName[(it.nombre || "").trim().toLowerCase()] ?? it.demo)
      : it.demo;
    return (
      <li key={it.id || i} className="bg-white border border-gray-100 rounded-xl p-4">
        <img src={AVATAR_PLACEHOLDER} alt={displayName} className="w-16 h-16 rounded-full object-cover mb-2" />
        <div className="font-semibold text-gray-900 flex items-center gap-2">
          {flag ? <span className="text-lg" role="img" aria-label={flagLabel}>{flag}</span> : null}
          <span>{displayName}</span>
        </div>
        <div className="text-sm text-gray-600">{it.genero} • {it.estilo}</div>
        <div className="mt-2">
          {it.type === "cantante"
            ? <DemoPlayer src={demoSrc} ariaLabel={`Demo de ${displayName}`} />
            : <AudioPlayer src={demoSrc} ariaLabel={`Demo de ${displayName}`} />}
        </div>
      </li>
    );
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4 flex items-center gap-3">
          <img src="/SMG PNG.png" alt="Sivar Music" className="h-8 w-auto" />
          <h1 className="text-2xl font-bold text-gray-900">{pl?.name || "Proyecto"}</h1>
        </div>
        {error && <p className="text-red-600">{error}</p>}
        {!pl ? (
          <p className="text-gray-600">Cargando…</p>
        ) : !pl.items?.length ? (
          <p className="text-gray-600">Este proyecto no tiene integrantes.</p>
        ) : pl.category === "cantante" ? (
          VOICE_GROUP_ORDER.map((group) => {
            const groupItems = pl.items.filter((it: any) => voiceOf(it) === group);
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
            {pl.items.map((it: any, i: number) => renderItem(it, i))}
          </ul>
        )}
      </div>
    </main>
  );
}
