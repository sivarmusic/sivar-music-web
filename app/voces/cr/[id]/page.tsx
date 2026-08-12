"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AudioPlayer from "@/app/voces/components/AudioPlayer";

// Ported from voces-bds's app/cr/[id]/page.tsx: public "casting results" view
// for a cantante casting. No auth: /voces/cr/ is proxy-allowlisted for
// anonymous visitors.
//  - /api/admin/cantantes/casting/results/${id}?public=1 ->
//    /api/voces/cantantes/casting/results/${id}?public=1 (a new, always-public
//    route added in this batch — see that route file's comment for why it's
//    not the already-ported admin one).
//  - params prop (typed `Promise<{id}>` but destructured directly via
//    `as any` in the original, without awaiting) -> useParams(), matching
//    the convention every other ported voces-bds client page in this repo
//    uses.

function isUploadedAudio(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("supabase.co") || url.includes("/storage/v1/");
}

function isExternalLink(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("http") && !url.includes("supabase.co");
}

export default function PublicCantantesCastingResults() {
  const { id } = useParams();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/voces/cantantes/casting/results/${id}?public=1`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.error || "Error");
        setData(j);
      } catch (e: any) {
        setError(e?.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const apps: any[] = data?.applications || [];

  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4"
            style={{ background: "var(--color-accent-bg)", border: "0.5px solid var(--color-accent-border)" }}
          >
            <span className="text-[11px] font-[600] tracking-widest uppercase" style={{ color: "var(--color-accent)" }}>
              Casting Cantantes
            </span>
          </span>
          <h1
            className="text-[32px] md:text-[40px] leading-none tracking-[-0.02em] mb-2"
            style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}
          >
            {data?.casting?.title || "Resultados"}
          </h1>
          {data?.casting?.createdAt && (
            <div className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
              {new Date(data.casting.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-16" style={{ color: "var(--color-text-muted)" }}>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-[13px]">Cargando…</span>
          </div>
        ) : error ? (
          <p className="text-[13px]" style={{ color: "var(--color-accent)" }}>{error}</p>
        ) : apps.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>Sin postulaciones aún.</p>
        ) : (
          <>
            <div className="text-[11px] font-[600] uppercase tracking-widest mb-5" style={{ color: "var(--color-text-muted)" }}>
              {apps.length} postulación{apps.length !== 1 ? "es" : ""}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {apps.map((a: any) => (
                <article
                  key={a.id}
                  className="rounded-[16px] p-5"
                  style={{
                    background: a.selected ? "rgba(74,222,128,0.04)" : "var(--color-bg-card)",
                    border: `0.5px solid ${a.selected ? "rgba(74,222,128,0.25)" : "var(--color-border-default)"}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div
                      className="text-[15px] font-[600]"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {a.firstName} {a.lastName}
                    </div>
                    {a.selected && (
                      <span
                        className="shrink-0 text-[10px] font-[600] rounded-full px-2 py-0.5"
                        style={{ background: "rgba(74,222,128,0.10)", color: "#4ade80" }}
                      >
                        ✓ Elegido
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4">
                    {a.country && (
                      <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                          <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.099 3.468-4.698 3.468-8.157C19.75 6.199 16.163 2.75 12 2.75S4.25 6.199 4.25 9.17c0 3.459 1.524 6.058 3.468 8.157a19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM12 12.25a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                        {a.country}
                      </span>
                    )}
                    {a.gender && (
                      <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                        {a.gender === "Female" ? "Femenino" : "Masculino"}
                      </span>
                    )}
                    {a.homeStudio && (
                      <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                          <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                          <path d="M6 10.5a.75.75 0 01.75.75v1.5a4.5 4.5 0 009 0v-1.5a.75.75 0 011.5 0v1.5a6 6 0 01-5.25 5.954V21h2.25a.75.75 0 010 1.5h-6a.75.75 0 010-1.5H10.5v-2.796A6 6 0 015.25 12.75v-1.5A.75.75 0 016 10.5z" />
                        </svg>
                        Home studio
                      </span>
                    )}
                    {a.onlineSessions && (
                      <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                          <path fillRule="evenodd" d="M2.25 5.25a3 3 0 013-3h13.5a3 3 0 013 3V15a3 3 0 01-3 3h-3v.257c0 .597.237 1.17.659 1.591l.621.622a.75.75 0 01-.53 1.28h-9a.75.75 0 01-.53-1.28l.621-.622a2.25 2.25 0 00.659-1.59V18h-3a3 3 0 01-3-3V5.25zm1.5 0v9.5c0 .414.336.75.75.75h16.5a.75.75 0 00.75-.75v-9.5a.75.75 0 00-.75-.75H4.5a.75.75 0 00-.75.75z" clipRule="evenodd" />
                        </svg>
                        Sesiones online
                      </span>
                    )}
                  </div>

                  {isUploadedAudio(a.audioUrl) ? (
                    <AudioPlayer src={a.audioUrl} ariaLabel={`Audio de ${a.firstName} ${a.lastName}`} />
                  ) : isExternalLink(a.audioUrl) ? (
                    <a
                      href={a.audioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[13px] underline"
                      style={{ color: "var(--color-accent)" }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                        <path d="M15.75 2.25H21a.75.75 0 01.75.75v5.25a.75.75 0 01-1.5 0V4.81L8.03 17.03a.75.75 0 01-1.06-1.06L19.19 3.75h-3.44a.75.75 0 010-1.5z" />
                        <path d="M3 7.5A.75.75 0 013.75 6.75h6a.75.75 0 010 1.5H4.5v12h12V13.5a.75.75 0 011.5 0v6.75A.75.75 0 0117.25 21H3.75A.75.75 0 013 20.25V7.5z" />
                      </svg>
                      Escuchar / Ver demo
                    </a>
                  ) : (
                    <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>Sin audio</p>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
