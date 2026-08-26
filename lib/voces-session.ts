// Sesión de usuario firmada para /voces. SERVER-ONLY.
//
// Reemplaza el modelo anterior, en el que la autorización de admin era el
// cookie constante `voces_admin=1` y la identidad era `voces_client=<id
// crudo>` (ver lib/voces-auth.ts). Ambos eran falsificables: el primero por
// ser una constante conocida (cualquiera puede setearla a mano), el segundo
// porque el id no tenía firma ni verificación de existencia.
//
// Ahora el cookie transporta un payload firmado con HMAC-SHA256 (mismo
// patrón que lib/voces-reportes/shareToken.ts) y el rol NUNCA viaja en el
// cookie: se lee de la fila de `voces_clients` en cada request. Revocar un
// admin (is_admin=false) o desactivarlo (active=false) tiene efecto
// inmediato, sin esperar a que expire ninguna sesión.
//
// Adaptado de voces-bds's lib/session.ts (su propio hardening, commit
// 99d15ef, hecho después de que este proyecto clonara voces-bds).
//
// TRANSICIÓN (corte gradual, a pedido del usuario): getSession/getAdmin
// todavía aceptan el cookie legacy `voces_client` como identidad si no hay
// una `voces_session` válida — así nadie con una sesión vieja abierta queda
// deslogueado de golpe. El cookie `voces_admin` (el que permitía
// autodeclararse admin) YA NO SE USA EN NINGÚN CASO, ni siquiera durante la
// transición: el rol siempre se relee de is_admin en la base. Una vez que
// se confirme que cada usuario real de Sivar entró al menos una vez con la
// sesión nueva, el fallback legacy se borra en un PR aparte (ver plan).

import crypto from "crypto";
import { supabase } from "@/lib/supabase";
import { VOCES_SESSION_COOKIE } from "@/lib/voces-session-cookie";

export { VOCES_SESSION_COOKIE };

const DEFAULT_TTL_DAYS = 1;
const REMEMBER_TTL_DAYS = 30;
const MAX_TOKEN_LEN = 512;

// Cookie legacy, solo lectura, solo como fallback de identidad durante la
// transición. Nunca se escribe desde este módulo.
const LEGACY_CLIENT_COOKIE = "voces_client";

export type SessionPayload = { cid: string; exp: number };

export type VocesIdentity = {
  clientId: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
};

// Secreto dedicado y obligatorio. A propósito SIN fallback a ninguna otra
// credencial (mismo motivo que REPORT_SHARE_SECRET): encadenar fallbacks es
// lo que deja un secreto compartido y rotable por accidente.
function secret(): string {
  const s = process.env.VOCES_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("Falta VOCES_SESSION_SECRET (mínimo 32 caracteres) para firmar sesiones");
  }
  return s;
}

function sign(body: string): string {
  return crypto.createHmac("sha256", secret()).update(body).digest("base64url");
}

export function signSession(clientId: string, remember = false): { token: string; maxAgeSeconds: number } {
  if (!clientId) throw new Error("clientId requerido");
  const dias = remember ? REMEMBER_TTL_DAYS : DEFAULT_TTL_DAYS;
  const exp = Date.now() + dias * 24 * 3600 * 1000;
  const body = Buffer.from(
    JSON.stringify({ cid: clientId, exp } satisfies SessionPayload),
    "utf8"
  ).toString("base64url");
  return { token: `${body}.${sign(body)}`, maxAgeSeconds: dias * 24 * 3600 };
}

export function verifySessionToken(token: string | null | undefined): SessionPayload | null {
  if (!token || token.length > MAX_TOKEN_LEN) return null;

  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let expected: string;
  try {
    expected = sign(body);
  } catch {
    return null; // secreto no configurado → falla cerrada
  }

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!p || typeof p.cid !== "string" || !p.cid) return null;
    if (typeof p.exp !== "number" || Date.now() > p.exp) return null;
    return p;
  } catch {
    return null;
  }
}

// Lectura exacta del cookie — no un `.includes()`, que además de inseguro da
// falsos positivos con cualquier cookie que contenga esa subcadena.
export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    return decodeURIComponent(part.slice(eq + 1).trim()) || null;
  }
  return null;
}

export function buildSessionCookie(token: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === "production";
  return `${VOCES_SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax; ${secure ? "Secure;" : ""}`;
}

export function buildClearCookie(name: string): string {
  return `${name}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

async function loadClientRow(clientId: string) {
  const { data, error } = await supabase
    .from("voces_clients")
    .select("id, email, name, active, is_admin")
    .eq("id", clientId)
    .maybeSingle();
  if (error || !data || data.active === false) return null;
  return data;
}

function toIdentity(row: { id: string; email: string; name: string | null; is_admin: boolean | null }): VocesIdentity {
  return { clientId: row.id, email: row.email, name: row.name ?? null, isAdmin: !!row.is_admin };
}

// Identidad de la sesión (cualquier usuario válido), sin exigir rol.
export async function getSession(req: Request): Promise<VocesIdentity | null> {
  const cookieHeader = req.headers.get("cookie");

  const raw = readCookie(cookieHeader, VOCES_SESSION_COOKIE);
  const payload = verifySessionToken(raw);
  if (payload) {
    const row = await loadClientRow(payload.cid);
    return row ? toIdentity(row) : null;
  }

  // Fallback legacy, solo durante la transición — ver comentario de arriba.
  const legacyId = readCookie(cookieHeader, LEGACY_CLIENT_COOKIE);
  if (!legacyId) return null;
  const row = await loadClientRow(legacyId);
  return row ? toIdentity(row) : null;
}

// Igual que getSession, pero exige is_admin=true en la fila. El rol se relee
// de la base SIEMPRE — incluso en el fallback legacy — así que la cookie
// voces_admin ya no se lee en ningún lado, en este módulo ni en ningún otro.
export async function getAdmin(req: Request): Promise<VocesIdentity | null> {
  const identity = await getSession(req);
  return identity?.isAdmin ? identity : null;
}

// Azúcar para route handlers: `if (!(await isAdminRequest(req))) return unauthorized();`
export async function isAdminRequest(req: Request): Promise<boolean> {
  return (await getAdmin(req)) !== null;
}

// Id del usuario de la sesión, o null.
export async function getSessionClientId(req: Request): Promise<string | null> {
  return (await getSession(req))?.clientId ?? null;
}
