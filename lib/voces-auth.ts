import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

/**
 * Voces client + admin auth.
 *
 * Ported from voces-bds's per-route `ensureAdmin()` + cookie checks, but
 * consolidated into one shared module (mirrors this repo's lib/pinkfest-auth.ts
 * pattern) instead of duplicating the cookie parsing in every route handler.
 *
 * Cookies:
 *  - voces_client: the logged-in client's id (voces_clients.id)
 *  - voces_admin:  "1" when that client has is_admin = true
 */

export const VOCES_CLIENT_COOKIE = "voces_client";
export const VOCES_ADMIN_COOKIE = "voces_admin";

export type VocesClient = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
};

/** Reads a cookie value from a raw `Cookie` header (used where NextRequest isn't available). */
function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match?.[1] ?? null;
}

/** Verifies a request carries the admin cookie. For use in /api/voces/admin/* route handlers. */
export function ensureAdmin(req: Request | NextRequest): boolean {
  const cookieHeader = req.headers.get("cookie");
  return readCookie(cookieHeader, VOCES_ADMIN_COOKIE) === "1";
}

/** Resolves the client id from the voces_client cookie, without hitting the database. */
export function getClientIdFromRequest(req: Request | NextRequest): string | null {
  const cookieHeader = req.headers.get("cookie");
  return readCookie(cookieHeader, VOCES_CLIENT_COOKIE);
}

/** Resolves the current client from the voces_client cookie, querying voces_clients. */
export async function getCurrentClient(req: Request | NextRequest): Promise<VocesClient | null> {
  const clientId = getClientIdFromRequest(req);
  if (!clientId) return null;

  const { data: client } = await supabase
    .from("voces_clients")
    .select("id, email, name, is_admin")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) return null;

  return {
    id: client.id,
    email: client.email,
    name: client.name,
    isAdmin: !!client.is_admin,
  };
}

/** Hashes a plaintext password for storage in voces_clients.password_hash. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** Verifies a plaintext password against a stored bcrypt hash. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
