/** Clasificación de tipo de voz (tesitura) de cantantes. Ported verbatim from voces-bds's lib/voice.ts. */

export const VOICE_TYPES = [
  "Soprano",
  "Mezzosoprano",
  "Contralto",
  "Tenor",
  "Barítono",
  "Bajo",
] as const;

export type VoiceType = (typeof VOICE_TYPES)[number];

/** Orden canónico para agrupar (agudo → grave), con "Otros" al final. */
export const VOICE_GROUP_ORDER: string[] = [...VOICE_TYPES, "Otros"];

/**
 * Intenta extraer un tipo de voz desde texto libre (notas).
 * El orden importa: "mezzosoprano" contiene "soprano", así que se chequea primero.
 */
export function parseVoiceType(text?: string | null): string | null {
  if (!text) return null;
  const s = text.toLowerCase();
  if (/mezzo\s*-?\s*soprano/.test(s)) return "Mezzosoprano";
  if (/soprano/.test(s)) return "Soprano";
  if (/contra\s*-?\s*alto|contralto/.test(s)) return "Contralto";
  if (/tenor/.test(s)) return "Tenor";
  if (/bar[ií]tono/.test(s)) return "Barítono";
  if (/\bbajo\b/.test(s)) return "Bajo";
  return null;
}

/**
 * Tipo de voz efectivo: usa el campo estructurado si existe;
 * si no, cae al parseo de las notas. Normaliza a la etiqueta canónica.
 */
export function effectiveVoiceType(voiceType?: string | null, notas?: string | null): string | null {
  const v = (voiceType ?? "").trim();
  if (v) {
    const canonical = VOICE_TYPES.find((t) => t.toLowerCase() === v.toLowerCase());
    return canonical ?? v;
  }
  return parseVoiceType(notas);
}
