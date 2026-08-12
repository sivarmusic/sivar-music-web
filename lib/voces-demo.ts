// Ported from voces-bds's lib/demo.ts.
//
// NOTE (Google Drive): extractDriveId/normalizeDemoUrl are pure URL-parsing
// helpers — no Google API calls happen here. The original app also had a
// server-side `/api/demo` + `/api/demo/meta` proxy (backed by GOOGLE_API_KEY)
// that actually streamed Drive-hosted files; that proxy was intentionally
// NOT ported (no Google Drive dependency in this batch). Practically this is
// a no-op today: new talent demos are uploaded straight to the
// `voces-talent-files` Supabase Storage bucket via registro/actualizar-reel,
// so no live data currently produces a Drive URL here. If legacy Drive links
// are ever imported, playback will degrade gracefully (see DemoPlayer) but
// won't actually stream until a Drive proxy is built.

/** Extrae el fileId de URLs comunes de Google Drive */
export function extractDriveId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // ?id=XXXXXXXX
    const qid = u.searchParams.get("id");
    if (qid) return qid;
    // /file/d/XXXXXXXX/view
    const m = url.match(/\/file\/d\/([^/]+)/);
    if (m?.[1]) return m[1];
  } catch {
    // URL relativa o inválida: no hay nada que extraer
  }
  return null;
}

/**
 * Normaliza un enlace de demo a uno reproducible.
 * Si es un enlace de Google Drive lo enruta por /api/voces/demo (streaming
 * con Content-Type correcto, soporte de Range y fallback de redirección).
 * Cualquier otra URL (uploads directos, blobs, etc.) se devuelve sin tocar.
 * Es idempotente: una URL ya normalizada (/api/voces/demo?id=...) se deja igual.
 */
export function normalizeDemoUrl(url?: string | null): string {
  if (!url || typeof url !== "string") return "";
  const id = extractDriveId(url);
  if (id) return `/api/voces/demo?id=${encodeURIComponent(id)}`;
  return url;
}
