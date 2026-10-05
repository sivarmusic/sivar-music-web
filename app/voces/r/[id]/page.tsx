"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AudioPlayer from "@/app/voces/components/AudioPlayer";
import { CandidateCard, GenderFilter, ResultsGroup, ResultsHead, ResultsHero, type GenderFilterValue } from "@/app/voces/components/casting/ResultsView";
import Arrow from "@/app/voces/components/casting/Arrow";

// Presentación: rediseño visual (tema casting, ver components/casting/ResultsView); lógica y textos no cambiaron.
// Ported from voces-bds's app/r/[id]/page.tsx: public "casting results" view
// for a locutor casting (title kept as-is: the original names this route /r/,
// but it's the same results page as /cr/ for cantantes). No auth: /voces/r/
// is proxy-allowlisted for anonymous visitors.
//  - /api/casting/results/${id} -> /api/voces/casting/results/${id}.
//  - params prop (typed `Promise<{id}>` but destructured directly via
//    `as any` in the original, without awaiting) -> useParams(), matching
//    the convention every other ported voces-bds client page in this repo
//    uses (e.g. app/voces/admin/casting/results/[id]/page.tsx).
//
// New (not in the original): once at least one application is selected, the
// page splits into a "Shortlist" section (selected applications, always
// visible) and a collapsible "Todas las postulaciones" section (every
// application, shortlisted ones included) so the public link shows the
// process — who's under consideration and the full applicant pool — instead
// of hiding everyone who isn't (pre)selected. While nobody is selected there
// is no shortlist yet: the full list is shown directly. "Ocultar del
// link" (the `hidden` flag from the admin panel) still fully excludes a
// given application from both sections; that's unchanged and is for
// spam/invalid entries, not for narrowing down finalists.

function isUploadedAudio(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("supabase.co") || url.includes("/storage/v1/") || url.startsWith("/api/demo");
}

function isExternalLink(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("http") && !url.includes("supabase.co") && !url.startsWith("/api/");
}

function ApplicationCard({ a, highlighted, index }: { a: any; highlighted?: boolean; index: number }) {
  return (
    <CandidateCard
      index={index}
      highlighted={highlighted}
      name={`${a.firstName} ${a.lastName}`}
      meta={
        <>
          {a.country ? <span className="cs-card-fact">{a.country}</span> : null}
          {a.homeStudio ? <span className="cs-card-fact">Home studio</span> : null}
          {a.onlineSessions ? <span className="cs-card-fact">Sesiones online</span> : null}
        </>
      }
    >
      {/* Audio / Link */}
      {isUploadedAudio(a.audioUrl) ? (
        <AudioPlayer src={a.audioUrl} ariaLabel={`Audio de ${a.firstName} ${a.lastName}`} />
      ) : isExternalLink(a.audioUrl) ? (
        <a href={a.audioUrl} target="_blank" rel="noopener noreferrer" className="cs-ref">
          <span aria-hidden="true" className="cs-ref-play">▶</span>
          <span>Escuchar / Ver demo</span>
        </a>
      ) : (
        <p className="cs-mono cs-card-none">Sin audio</p>
      )}
    </CandidateCard>
  );
}

export default function PublicCastingResults() {
  const { id } = useParams();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/voces/casting/results/${id}?public=1`, { cache: "no-store" });
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
  const shortlist = apps.filter((a) => a.selected);

  const state = loading ? "loading" : error ? "error" : "ready";

  // Filtro por género: solo estado de UI. Las postulaciones sin género solo aparecen en "Todos".
  const [gf, setGf] = useState<GenderFilterValue>("all");
  const males = apps.filter((a) => a.gender === "Male").length;
  const females = apps.filter((a) => a.gender === "Female").length;
  const showFilter = males > 0 && females > 0;
  const gfEff: GenderFilterValue = showFilter ? gf : "all";
  const pass = (a: (typeof apps)[number]) => gfEff === "all" || a.gender === (gfEff === "male" ? "Male" : "Female");
  const fApps = apps.filter(pass);
  const fShort = shortlist.filter(pass);
  // Numeración estable: la misma persona conserva su número en Shortlist y en la lista completa.
  const num = (a: (typeof apps)[number]) => apps.indexOf(a);
  const emptyCat = <p className="cs-results-note">No hay postulaciones en esta categoría</p>;

  return (
    <main>
      <ResultsHero title={data?.casting?.title || "Resultados"} createdAt={data?.casting?.createdAt} state={state} />

      <div className="cs-container cs-body cs-results-body">
        {loading ? (
          <div>
            <p role="status" className="cs-mono cs-results-note">Cargando…</p>
            <p aria-hidden="true" className="cs-results-sub">Estamos preparando las voces para vos.</p>
          </div>
        ) : error ? (
          <div>
            <p role="alert" className="cs-results-note cs-results-note--err">{error}</p>
            <p className="cs-results-sub">Si creés que es un error, escribile a tu ejecutivo de Sivar.</p>
          </div>
        ) : apps.length === 0 ? (
          <div>
            <p className="cs-results-note">Sin postulaciones aún.</p>
            <p className="cs-results-sub">Las voces van a aparecer acá apenas lleguen.</p>
          </div>
        ) : (
          <>
            {showFilter ? (
              <GenderFilter
                value={gfEff}
                onChange={setGf}
                counts={{ all: apps.length, male: males, female: females }}
              />
            ) : null}
            {shortlist.length === 0 ? (
              /* Nadie seleccionado todavía: no hay shortlist, se muestra la lista completa. */
              fApps.length === 0 ? (
                emptyCat
              ) : (
                <ResultsGroup title={`Postulaciones — ${fApps.length}`}>
                  <div className="cs-results-grid">
                    {fApps.map((a) => (
                      <ApplicationCard key={`all-${a.id}`} a={a} index={num(a)} />
                    ))}
                  </div>
                </ResultsGroup>
              )
            ) : (
              <div className="space-y-12">
                {/* Shortlist */}
                {fShort.length === 0 ? (
                  emptyCat
                ) : (
                  <ResultsGroup title={`Shortlist — ${fShort.length}`}>
                    <div className="cs-results-grid">
                      {fShort.map((a) => (
                        <ApplicationCard key={`shortlist-${a.id}`} a={a} highlighted index={num(a)} />
                      ))}
                    </div>
                  </ResultsGroup>
                )}

                {/* Todas las postulaciones (desplegable) */}
                {fApps.length > 0 ? (
                  <details className="cs-details group">
                    <summary className="cs-details-sum">
                      <span className="cs-section-head">
                        <ResultsHead>Ver todas las postulaciones — {fApps.length}</ResultsHead>
                      </span>
                      <span aria-hidden="true" className="cs-details-chev">
                        <Arrow />
                      </span>
                    </summary>
                    <div className="cs-results-grid mt-8">
                      {fApps.map((a) => (
                        <ApplicationCard key={`all-${a.id}`} a={a} highlighted={!!a.selected} index={num(a)} />
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
