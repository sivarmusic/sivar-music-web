// Tokens firmados para compartir un reporte por link. SERVER-ONLY.
//
// El reporte es global (buildReport no filtra por usuario), así que el token
// solo necesita transportar el rango de fechas + una expiración. Va firmado con
// HMAC-SHA256 para que nadie pueda fabricar links ni cambiar el rango a mano.
// No requiere tabla en Supabase: el estado vive dentro del propio token.
//
// Ported from voces-bds's lib/reportes/shareToken.ts, keeping the
// REPORT_SHARE_SECRET env var name as-is (not BDS-branded, no rename needed).
// One change: the secret fallback chain dropped ADMIN_PASSWORD — that env var
// doesn't exist in this repo (voces admin auth here is bcrypt-hashed rows in
// voces_clients, not a single shared password, see lib/voces-auth.ts) — and
// keeps SUPABASE_SERVICE_ROLE_KEY, which this repo already has (lib/supabase.ts).

import crypto from "crypto";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_TTL_DAYS = 7; // mínimo privilegio: se puede extender al compartir
const MAX_TTL_DAYS = 365;

export type SharePayload = {
  d: string; // desde (YYYY-MM-DD)
  h: string; // hasta (YYYY-MM-DD)
  exp: number; // epoch ms
};

// Secreto de firma. Usa REPORT_SHARE_SECRET si está definido; si no cae a
// SUPABASE_SERVICE_ROLE_KEY (ya presente en todos los entornos) para no
// bloquear el deploy. Ojo: cambiar el secreto invalida los links ya compartidos.
function secret(): string {
  const s = process.env.REPORT_SHARE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Falta REPORT_SHARE_SECRET (o SUPABASE_SERVICE_ROLE_KEY) para firmar links de reporte");
  return s;
}

function sign(body: string): string {
  return crypto.createHmac("sha256", secret()).update(body).digest("base64url");
}

export function signShareToken(
  desde: string,
  hasta: string,
  ttlDays: number = DEFAULT_TTL_DAYS,
): { token: string; expiresAt: string } {
  if (!DATE_RE.test(desde) || !DATE_RE.test(hasta)) throw new Error("Rango inválido (usar YYYY-MM-DD)");
  if (desde > hasta) throw new Error("La fecha 'desde' es posterior a 'hasta'");

  const dias = Math.min(Math.max(Math.floor(ttlDays) || DEFAULT_TTL_DAYS, 1), MAX_TTL_DAYS);
  const exp = Date.now() + dias * 24 * 3600 * 1000;

  const payload: SharePayload = { d: desde, h: hasta, exp };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return { token: `${body}.${sign(body)}`, expiresAt: new Date(exp).toISOString() };
}

// Devuelve el payload si la firma es válida y no expiró; null en cualquier
// otro caso (token malformado, firma inválida, vencido).
export function verifyShareToken(token: string | null | undefined): SharePayload | null {
  if (!token || token.length > 512) return null;

  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let expected: string;
  try {
    expected = sign(body);
  } catch {
    return null; // secreto no configurado
  }

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SharePayload;
    if (!p || !DATE_RE.test(p.d) || !DATE_RE.test(p.h) || p.d > p.h) return null;
    if (typeof p.exp !== "number" || Date.now() > p.exp) return null;
    return p;
  } catch {
    return null;
  }
}
