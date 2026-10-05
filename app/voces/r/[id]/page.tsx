"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AudioPlayer from "@/app/voces/components/AudioPlayer";
import { CandidateCard, ResultsGroup, ResultsHead, ResultsHero } from "@/app/voces/components/casting/ResultsView";
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

  return (
    <main>
      <ResultsHero title={data?.casting?.title || "Resultados"} createdAt={data?.casting?.createdAt} state={state} />

      <div className="cs-container cs-body">
        {loading ? (
          <p role="status" className="cs-mono cs-results-note">Cargando…</p>
        ) : error ? (
          <p role="alert" className="cs-results-note cs-results-note--err">{error}</p>
        ) : apps.length === 0 ? (
          <p className="cs-results-note">Sin postulaciones aún.</p>
        ) : shortlist.length === 0 ? (
          /* Nadie seleccionado todavía: no hay shortlist, se muestra la lista completa. */
          <ResultsGroup n={apps.length} title={`Postulaciones — ${apps.length}`}>
            <div className="cs-results-grid">
              {apps.map((a, i) => (
                <ApplicationCard key={`all-${a.id}`} a={a} index={i} />
              ))}
            </div>
          </ResultsGroup>
        ) : (
          <div className="space-y-16">
            {/* Shortlist */}
            <ResultsGroup n={shortlist.length} title={`Shortlist — ${shortlist.length}`}>
              <div className="cs-results-grid">
                {shortlist.map((a: any, i: number) => (
                  <ApplicationCard key={`shortlist-${a.id}`} a={a} highlighted index={i} />
                ))}
              </div>
            </ResultsGroup>

            {/* Todas las postulaciones (desplegable) */}
            <details className="cs-details group">
              <summary className="cs-details-sum">
                <span className="cs-section-head">
                  <ResultsHead n={apps.length}>Ver todas las postulaciones — {apps.length}</ResultsHead>
                </span>
                <span aria-hidden="true" className="cs-details-chev">
                  <Arrow />
                </span>
              </summary>
              <div className="cs-results-grid mt-8">
                {apps.map((a: any, i: number) => (
                  <ApplicationCard key={`all-${a.id}`} a={a} highlighted={!!a.selected} index={i} />
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </main>
  );
}
