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
import DocFrame from "@/app/voces/components/casting/DocFrame";

// Ported from voces-bds's app/c/[id]/page.tsx: public locutor casting detail
// page (the /voces/c/{shareId} link shared with talents). No auth: /voces/c/
// is proxy-allowlisted for anonymous visitors.
//  - /api/casting?id= -> /api/voces/casting?id=.
//  - "BDS Voces" branding in the closed-casting message removed (see below).
// Presentación: rediseño visual (tema casting); la lógica de datos no cambió.

// Solo etiqueta de presentación: el valor guardado sigue siendo Female/Male.
const GENDER_ES: Record<string, string> = { Female: "Femenino", Male: "Masculino" };

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
    if (item.criteria.gender) voz.push(GENDER_ES[item.criteria.gender] || item.criteria.gender);
    const estilos: string[] = item.criteria.styles || [];
    const edades: string[] = item.criteria.ages || [];
    sections.push({
      key: "voz",
      title: "Características de la voz",
      node: (
        <div className="cs-spec">
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
              <DocFrame label="GUION · PDF">
                <PdfViewer src={pdfSrc} fallbackHref={item.scriptUrl} />
              </DocFrame>
              <p className="mt-3 text-[14px] text-cs-ink-2">
                Si no ves el documento,{" "}
                <a href={item.scriptUrl} target="_blank" className="cs-textlink">
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
        <a href={item.referenceUrl} target="_blank" className="cs-ref cs-mono"><span aria-hidden="true" className="cs-ref-play">▶</span><span>{(item.referenceUrl as string).split(/(?<=\/)/).map((part: string, i: number) => (<span key={i}>{i > 0 ? <wbr /> : null}{part}</span>))}</span></a>
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
      <CastingDetailView item={item} applyHref={`/voces/c/${id}/apply`} sections={sections}
        closedNext={{
          title: "No te pierdas ningún casting",
          text: "Enviamos nuestros castings por mail. Sumate a Sivar Voces o mantené tus datos actualizados para que te tengamos en cuenta y recibas todas las oportunidades.",
          primary: { href: "/voces/registro", label: "Sumarme a la base" },
          secondary: { href: "/voces/actualizar-reel", label: "Actualizar mi información" },
        }}
      />
    </main>
  );
}
