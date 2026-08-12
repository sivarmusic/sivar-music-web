// Ported from voces-bds's lib/casting-fields.ts: shared parser for a
// casting's business fields (budget, currency, status, client, media type),
// used by both locutor and cantante casting create/update routes.
import type { VocesCastingStatus, VocesCastingCurrency } from "@/lib/voces-castings";

const VALID_STATUS: VocesCastingStatus[] = ["open", "in_selection", "closed", "finished"];
const VALID_CURRENCY: VocesCastingCurrency[] = ["ARS", "USD"];

export type CastingBusinessFields = {
  budget: number | null;
  currency: VocesCastingCurrency | null;
  status: VocesCastingStatus | null;
  client: string | null;
  mediaType: string | null;
};

/**
 * Extrae y sanitiza los campos de negocio desde un FormData.
 * Devuelve `null` en cada campo ausente/inválido para no pisar datos por error.
 * `presentOnly` = solo incluye en el objeto las claves que llegaron en el form
 * (útil en update para no resetear columnas que el form no mandó).
 */
export function parseCastingBusinessFields(
  fd: FormData,
  opts: { presentOnly?: boolean } = {}
): Partial<CastingBusinessFields> {
  const out: Partial<CastingBusinessFields> = {};
  const has = (k: string) => fd.get(k) !== null;

  if (!opts.presentOnly || has("budget")) {
    const raw = String(fd.get("budget") ?? "").replace(/[^0-9.,-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = raw ? Number(raw) : NaN;
    out.budget = Number.isFinite(n) && n >= 0 ? n : null;
  }
  if (!opts.presentOnly || has("currency")) {
    const c = String(fd.get("currency") ?? "").trim().toUpperCase();
    out.currency = (VALID_CURRENCY as string[]).includes(c) ? (c as VocesCastingCurrency) : null;
  }
  if (!opts.presentOnly || has("status")) {
    const s = String(fd.get("status") ?? "").trim();
    out.status = (VALID_STATUS as string[]).includes(s) ? (s as VocesCastingStatus) : "open";
  }
  if (!opts.presentOnly || has("client")) {
    const cl = String(fd.get("client") ?? "").trim();
    out.client = cl || null;
  }
  if (!opts.presentOnly || has("mediaType")) {
    const m = String(fd.get("mediaType") ?? "").trim();
    out.mediaType = m || null;
  }
  return out;
}
