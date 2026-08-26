import bcrypt from "bcryptjs";

/**
 * Password hashing for voces_clients.password_hash.
 *
 * The cookie/session auth that used to live in this file (ensureAdmin,
 * getClientIdFromRequest, getCurrentClient — insecure, unsigned cookie
 * checks) moved to lib/voces-session.ts (getAdmin, getSession,
 * getSessionClientId, isAdminRequest) as part of the signed-session
 * migration. Every caller was migrated in the same change — if you're
 * looking for those functions, they don't exist here anymore.
 */

/** Hashes a plaintext password for storage in voces_clients.password_hash. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** Verifies a plaintext password against a stored bcrypt hash. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
