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

// Ported from voces-bds's app/cc/[id]/page.tsx: public cantante casting
// detail page (the /voces/cc/{shareId} link shared with talents). No auth:
// /voces/cc/ is proxy-allowlisted for anonymous visitors.
//  - /api/cantantes/casting?id= -> /api/voces/cantantes/casting?id=.
// Presentación: rediseño visual (tema casting); la lógica de datos no cambió.

/** Descarga un archivo forzando el guardado (no lo abre en el navegador). */
async function triggerDownload(url: string, label: string) {
  const raw = url.split("/").pop()?.split("?")[0] || "";
  const ext = raw.includes(".") ? raw.split(".").pop() || "" : "";
  const filename = ext ? `${label}.${ext}` : label || "archivo";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch {
    // Fallback: abre en nueva pestaña si el fetch falla
    window.open(url, "_blank");
  }
}

// Solo etiqueta de presentación: el valor guardado sigue siendo Female/Male.
const GENDER_ES: Record<string, string> = { Female: "Femenino", Male: "Masculino" };

export default function CantanteCastingPublicPage() {
  const { id } = useParams();
  const [item, setItem] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  async function handleDownload(url: string, label: string, idx: number) {
    setDownloading(idx);
    await triggerDownload(url, label);
    setDownloading(null);
  }

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/voces/cantantes/casting?id=${id}`);
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.error || "No disponible");
        setItem(j.casting);
      } catch (e: any) {
        setError(e?.message || "Error");
      }
    })();
  }, [id]);

  const pdfSrc = useMemo(() => item?.scriptUrl as string || "", [item?.scriptUrl]);

  if (!item) {
    return (
      <main>
        {error ? <CastingErrorState message={error} /> : <CastingSkeleton />}
      </main>
    );
  }

  const videoCls = "w-full bg-black";
  const sections: DetailSection[] = [];

  if (item.criteria && (item.criteria.styles?.length || item.criteria.country || item.criteria.gender || item.criteria.vocalRange)) {
    const pais: string[] = [item.criteria.country].filter(Boolean);
    const genero: string[] = [item.criteria.gender].filter(Boolean).map((g: string) => GENDER_ES[g] || g);
    const registro: string[] = [item.criteria.vocalRange].filter(Boolean);
    const estilos: string[] = item.criteria.styles || [];
    sections.push({
      key: "perfil",
      title: "Perfil buscado",
      node: (
        <div className="cs-spec">
          <ChipRow label="País" items={pais} />
          <ChipRow label="Género" items={genero} />
          <ChipRow label="Registro" items={registro} />
          <ChipRow label="Estilos" items={estilos} />
        </div>
      ),
    });
  }

  sections.push(
    item.scriptUrl
      ? {
          key: "guion",
          title: "Letra / Guion",
          node: (
            <div>
              <DocFrame label="LETRA / GUION · PDF">
                <PdfViewer src={pdfSrc} fallbackHref={item.scriptUrl} />
              </DocFrame>
              <p className="mt-3 text-[14px] text-cs-ink-2">Si no ves el documento, <a href={item.scriptUrl} target="_blank" className="cs-textlink">abrilo aquí</a>.</p>
            </div>
          ),
        }
      : { key: "guion", title: "Letra / Guion", node: "Sin guion", compact: true }
  );

  if (item.referenceUrl && !(item.attachments?.length)) {
    sections.push({
      key: "referencia",
      title: "Referencia",
      node: /\.(mp4|webm|mov)$/i.test(item.referenceUrl) ? (
        <video src={item.referenceUrl} controls controlsList="nodownload noplaybackrate" onContextMenu={(e) => e.preventDefault()} className={videoCls} />
      ) : /\.(mp3|wav|ogg)$/i.test(item.referenceUrl) ? (
        <AudioPlayer src={item.referenceUrl} ariaLabel="Referencia de audio" />
      ) : (
        <a href={item.referenceUrl} target="_blank" className="cs-ref cs-mono"><span aria-hidden="true" className="cs-ref-play">▶</span><span className="min-w-0 break-all">{item.referenceUrl}</span></a>
      ),
    });
  }

  if (Array.isArray(item.attachments) && item.attachments.length > 0) {
    sections.push({
      key: "archivos",
      title: "Archivos para descargar",
      node: (
        <div className="border-t border-cs-rule">
          {(item.attachments as Array<{ label: string; url: string }>).map((att, i) => {
            const ext = (att.url?.split("?")[0]?.split(".").pop() || "").toLowerCase();
            const icon = ["mp3","wav","ogg","m4a","aac","flac"].includes(ext) ? "🎵"
                        : ["mp4","webm","mov","avi"].includes(ext) ? "🎬"
                        : ["pdf"].includes(ext) ? "📄"
                        : ["doc","docx","txt","rtf","odt"].includes(ext) ? "📝"
                        : ["jpg","jpeg","png","gif","webp"].includes(ext) ? "🖼️"
                        : "📎";
            const isLoading = downloading === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleDownload(att.url, att.label || "Archivo", i)}
                disabled={isLoading}
                className="cs-file"
              >
                <span aria-hidden="true" className="text-[20px] shrink-0">{isLoading ? "⏳" : icon}</span>
                <span className="flex-1 text-[16px] font-[500]">{att.label || "Archivo"}</span>
                <span className="cs-file-action cs-mono text-[13px] shrink-0">
                  {isLoading ? "Descargando…" : "Descargar"}
                </span>
              </button>
            );
          })}
        </div>
      ),
    });
  }

  sections.push(
    item.videoUrl
      ? {
          key: "video",
          title: "Video del casting",
          node: <video src={item.videoUrl} controls controlsList="nodownload noplaybackrate" onContextMenu={(e) => e.preventDefault()} className={videoCls} />,
        }
      : { key: "video", title: "Video del casting", node: "Sin video", compact: true }
  );

  return (
    <main>
      <CastingDetailView item={item} applyHref={`/voces/cc/${id}/apply`} sections={sections} />
    </main>
  );
}
