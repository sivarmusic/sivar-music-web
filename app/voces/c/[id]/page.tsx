"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AudioPlayer from "@/app/voces/components/AudioPlayer";
import PdfViewer from "@/app/voces/components/PdfViewer";
import CastingDetailView, {
  CastingErrorState,
  CastingSkeleton,
  type DetailSection,
} from "@/app/voces/components/casting/CastingDetailView";
import { ChipRow } from "@/app/voces/components/casting/Chips";

// Ported from voces-bds's app/c/[id]/page.tsx: public locutor casting detail
// page (the /voces/c/{shareId} link shared with talents). No auth: /voces/c/
// is proxy-allowlisted for anonymous visitors.
//  - /api/casting?id= -> /api/voces/casting?id=.
//  - "BDS Voces" branding in the closed-casting message removed (see below).
// Presentación: rediseño visual (tema casting); la lógica de datos no cambió.

export default function CastingPublicPage() {
  const { id } = useParams();
  const [item, setItem] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/voces/casting?id=${id}`);
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.error || "No disponible");
        setItem(j.casting);
      } catch (e: any) {
        setError(e?.message || "Error");
      }
    })();
  }, [id]);

  const pdfSrc = useMemo(() => {
    if (!item?.scriptUrl) return "";
    return item.scriptUrl as string;
  }, [item?.scriptUrl]);

  if (!item) {
    return (
      <main>
        {error ? <CastingErrorState message={error} /> : <CastingSkeleton />}
      </main>
    );
  }

  const videoCls = "w-full bg-black";
  const sections: DetailSection[] = [];

  if (item?.criteria) {
    const voz: string[] = [];
    if (item.criteria.language) voz.push(`${item.criteria.language}${item.criteria.accent ? ` - ${item.criteria.accent}` : ""}`);
    if (item.criteria.gender) voz.push(item.criteria.gender);
    const estilos: string[] = item.criteria.styles || [];
    const edades: string[] = item.criteria.ages || [];
    sections.push({
      key: "voz",
      title: "Características de la voz",
      node: (
        <div>
          <ChipRow label="Voz" items={voz} />
          <ChipRow label="Estilos" items={estilos} />
          <ChipRow label="Edades" items={edades} />
        </div>
      ),
    });
  }

  sections.push(
    item.scriptUrl
      ? {
          key: "guion",
          title: "Guion del casting",
          node: (
            <div>
              <PdfViewer src={pdfSrc} fallbackHref={item.scriptUrl} />
              <p className="mt-3 text-[14px] text-cs-ink-2">
                Si no ves el documento,{" "}
                <a href={item.scriptUrl} target="_blank" className="underline text-cs-signal">
                  abrilo aquí
                </a>.
              </p>
            </div>
          ),
        }
      : { key: "guion", title: "Guion del casting", node: "Sin guion", compact: true }
  );

  if (item.referenceUrl) {
    sections.push({
      key: "referencia",
      title: "Referencia (link / audio / video)",
      node: /\.(mp4|webm|mov)$/i.test(item.referenceUrl) ? (
        <video
          src={item.referenceUrl}
          controls
          controlsList="nodownload noplaybackrate"
          onContextMenu={(e) => e.preventDefault()}
          className={videoCls}
        />
      ) : /\.(mp3|wav|ogg)$/i.test(item.referenceUrl) ? (
        <AudioPlayer src={item.referenceUrl} ariaLabel="Referencia de audio" />
      ) : (
        <a href={item.referenceUrl} target="_blank" className="underline break-all text-[14px] text-cs-signal">{item.referenceUrl}</a>
      ),
    });
  }

  sections.push(
    item.videoUrl
      ? {
          key: "video",
          title: "Video del casting",
          node: (
            <video
              src={item.videoUrl}
              controls
              controlsList="nodownload noplaybackrate"
              onContextMenu={(e) => e.preventDefault()}
              className={videoCls}
            />
          ),
        }
      : { key: "video", title: "Video del casting", node: "Sin video", compact: true }
  );

  return (
    <main>
      <CastingDetailView item={item} applyHref={`/voces/c/${id}/apply`} sections={sections} />
    </main>
  );
}
