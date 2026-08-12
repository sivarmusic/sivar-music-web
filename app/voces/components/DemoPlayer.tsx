"use client";
import { useEffect, useState } from "react";
import AudioPlayer from "@/app/voces/components/AudioPlayer";
import { extractYouTubeId, isVideoUrl, instagramEmbedUrl } from "@/lib/voces-media";
import { extractDriveId } from "@/lib/voces-demo";

/**
 * Reproductor de demo que se adapta a la fuente:
 * - Link de YouTube        -> thumbnail + reproductor embebido (play in-place)
 * - Link de Google Drive   -> thumbnail + reproductor embebido de Drive (audio o video)
 * - Link de Instagram      -> post/reel público embebido de Instagram
 * - Archivo de video        -> <video> nativo
 * - Cualquier otra          -> AudioPlayer (mp3/wav/etc.)
 *
 * NOTE (Google Drive): DriveFacade below calls /api/voces/demo/meta, which is
 * NOT implemented in this batch (see lib/voces-demo.ts for why — it needs a
 * Google Drive API proxy, out of scope). No current voces_talent/voces_cantante
 * data has Drive URLs (registro/actualizar-reel upload straight to Supabase
 * Storage), so this branch is effectively dead code today; it's kept so the
 * component still degrades gracefully (falls back to a broken-but-non-crashing
 * video tag) if legacy Drive links are ever imported later.
 */
export default function DemoPlayer({
  src,
  ariaLabel,
  trackName,
}: {
  src?: string | null;
  ariaLabel?: string;
  trackName?: string;
}) {
  const url = (src || "").trim();
  const ytId = extractYouTubeId(url);

  if (ytId) return <YouTubeFacade id={ytId} ariaLabel={ariaLabel} />;

  const driveId = extractDriveId(url);
  if (driveId) return <DriveFacade id={driveId} ariaLabel={ariaLabel} />;

  const igEmbed = instagramEmbedUrl(url);
  if (igEmbed) return <InstagramFacade embed={igEmbed} ariaLabel={ariaLabel} />;

  if (isVideoUrl(url)) {
    return (
      <video
        src={url}
        controls
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        className="mt-3 w-full rounded-[9px] bg-black"
        style={{ border: "0.5px solid var(--color-border-default)" }}
        aria-label={ariaLabel}
      />
    );
  }

  return <AudioPlayer src={src} ariaLabel={ariaLabel} trackName={trackName} />;
}

function DriveFacade({ id, ariaLabel }: { id: string; ariaLabel?: string }) {
  // Detectamos el tipo real del archivo de Drive para elegir el reproductor.
  const [kind, setKind] = useState<"loading" | "video" | "audio">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/voces/demo/meta?id=${encodeURIComponent(id)}`, { cache: "force-cache" });
        const j = await res.json().catch(() => null);
        const mime: string = j?.mimeType || "";
        if (cancelled) return;
        // Drive suele reportar los .mov como quicktime (video).
        if (/^audio\//i.test(mime)) setKind("audio");
        else setKind("video"); // por defecto tratamos como video (incluye video/* y desconocidos)
      } catch {
        if (!cancelled) setKind("video");
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (kind === "audio") {
    return <AudioPlayer src={`/api/voces/demo?id=${encodeURIComponent(id)}`} ariaLabel={ariaLabel} />;
  }

  if (kind === "video") {
    return (
      <video
        src={`/api/voces/demo?id=${encodeURIComponent(id)}&raw=1`}
        controls
        controlsList="nodownload"
        preload="metadata"
        onContextMenu={(e) => e.preventDefault()}
        className="mt-3 w-full rounded-[9px] bg-black"
        style={{ border: "0.5px solid var(--color-border-default)" }}
        aria-label={ariaLabel}
      />
    );
  }

  // loading: placeholder discreto con el aspecto de una tarjeta de video
  return (
    <div
      className="mt-3 w-full rounded-[9px] flex items-center justify-center"
      style={{ aspectRatio: "16 / 9", background: "rgba(255,255,255,0.03)", border: "0.5px solid var(--color-border-default)" }}
    >
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" style={{ color: "var(--color-text-muted)" }}>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    </div>
  );
}

function InstagramFacade({ embed, ariaLabel }: { embed: string; ariaLabel?: string }) {
  const [playing, setPlaying] = useState(false);
  const IG_GRADIENT = "linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)";

  if (playing) {
    return (
      <div className="mt-3 w-full mx-auto rounded-[9px] overflow-hidden bg-white" style={{ maxWidth: 400, aspectRatio: "4 / 5", border: "0.5px solid var(--color-border-default)" }}>
        <iframe
          src={embed}
          title={ariaLabel || "Instagram"}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          scrolling="no"
          className="w-full h-full block"
          style={{ border: 0 }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={ariaLabel || "Ver publicación de Instagram"}
      className="mt-3 w-full mx-auto rounded-[9px] overflow-hidden relative group flex items-center justify-center"
      style={{ maxWidth: 400, aspectRatio: "4 / 5", background: IG_GRADIENT }}
    >
      <span className="absolute inset-0" style={{ background: "rgba(0,0,0,0.15)" }} />
      <span className="relative flex flex-col items-center gap-2 text-white">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-8 h-8">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
        </svg>
        <span className="flex items-center justify-center rounded-full transition-transform duration-150 group-hover:scale-105" style={{ width: 44, height: 44, background: "rgba(255,255,255,0.95)" }}>
          <svg viewBox="0 0 20 20" fill="#1a1a1a" className="w-4 h-4 ml-0.5">
            <path d="M4.5 3.5v13l11-6.5-11-6.5z" />
          </svg>
        </span>
        <span className="text-[12px] font-[500]">Ver en Instagram</span>
      </span>
    </button>
  );
}

function YouTubeFacade({ id, ariaLabel }: { id: string; ariaLabel?: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div
        className="mt-3 w-full rounded-[9px] overflow-hidden bg-black"
        style={{ aspectRatio: "16 / 9", border: "0.5px solid var(--color-border-default)" }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={ariaLabel || "YouTube"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full block"
          style={{ border: 0 }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={ariaLabel || "Reproducir video de YouTube"}
      className="mt-3 w-full rounded-[9px] overflow-hidden relative group"
      style={{ aspectRatio: "16 / 9", border: "0.5px solid var(--color-border-default)" }}
    >
      <img
        src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
        alt=""
        className="w-full h-full object-cover"
      />
      <span className="absolute inset-0 flex items-center justify-center transition-colors" style={{ background: "rgba(0,0,0,0.28)" }}>
        <span className="flex items-center justify-center rounded-[10px] transition-transform duration-150 group-hover:scale-105" style={{ width: 56, height: 40, background: "#f00" }}>
          <svg viewBox="0 0 20 20" fill="#fff" className="w-4 h-4 ml-0.5">
            <path d="M4.5 3.5v13l11-6.5-11-6.5z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
