/**
 * Utilidades para detectar el tipo de una fuente de demo:
 * YouTube, video subido, o audio.
 *
 * Ported verbatim from voces-bds's lib/media.ts.
 */

/** Extrae el ID de video de una URL de YouTube. Devuelve null si no es YouTube. */
export function extractYouTubeId(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const s = url.trim();
  // youtu.be/ID
  let m = s.match(/^https?:\/\/(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (m?.[1]) return m[1];
  // youtube.com/watch?v=ID
  m = s.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (m?.[1]) return m[1];
  // youtube.com/embed/ID  ó  youtube.com/shorts/ID  ó  /live/ID
  m = s.match(/youtube\.com\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
  if (m?.[1]) return m[1];
  return null;
}

const VIDEO_EXT = /\.(mp4|mov|webm|m4v|ogv|avi|mkv)(\?|#|$)/i;

/** True si la URL apunta a un archivo de video (por extensión). */
export function isVideoUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  return VIDEO_EXT.test(url.trim());
}

/**
 * Devuelve la URL de embed de Instagram para un post/reel/tv público.
 * null si no es un link de Instagram embebible (ej: perfil o story).
 */
export function instagramEmbedUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/instagram\.com\/(?:[^/?#]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  const type = m[1].toLowerCase() === "reels" ? "reel" : m[1].toLowerCase();
  return `https://www.instagram.com/${type}/${m[2]}/embed`;
}

export type MediaKind = "youtube" | "video" | "audio";

/** Clasifica una fuente de demo. Audio es el caso por defecto. */
export function detectMediaKind(url?: string | null): MediaKind {
  if (extractYouTubeId(url)) return "youtube";
  if (isVideoUrl(url)) return "video";
  return "audio";
}
