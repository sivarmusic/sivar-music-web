/**
 * Sound for Films access gate.
 *
 * Runs in both the Edge middleware and Node route handlers, so it relies only
 * on Web Crypto and `fetch` — no `node:crypto`, no supabase-js.
 *
 * The on/off flag lives in Supabase so it can be toggled without a redeploy.
 * The password never reaches the browser: it is verified server side and
 * exchanged for a short-lived HMAC-signed cookie.
 */

export const GATE_COOKIE = "sff_access";
export const GATE_PATH = "/sound-for-films";
export const GATE_ACCESS_PATH = "/sound-for-films/acceso";

/** How long a granted session stays valid. */
const SESSION_TTL_SECONDS = 8 * 60 * 60;

/**
 * Settings are read on every gated request, so they are cached in module
 * scope. A toggle therefore takes up to this long to propagate.
 */
const SETTINGS_CACHE_MS = 30_000;

const PBKDF2_ITERATIONS = 100_000;

export type GateSettings = {
  gateEnabled: boolean;
  passwordHash: string | null;
};

/** Fail closed: if we cannot read the flag, keep the portfolio locked. */
const FAILSAFE_SETTINGS: GateSettings = {
  gateEnabled: true,
  passwordHash: null,
};

let settingsCache: { value: GateSettings; expiresAt: number } | null = null;

const encoder = new TextEncoder();

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function invalidateGateSettingsCache() {
  settingsCache = null;
}

export async function getGateSettings(): Promise<GateSettings> {
  const now = Date.now();
  if (settingsCache && settingsCache.expiresAt > now) {
    return settingsCache.value;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return FAILSAFE_SETTINGS;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/sound_for_films_settings` +
        `?id=eq.1&select=gate_enabled,password_hash`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) return FAILSAFE_SETTINGS;

    const rows = (await response.json()) as Array<{
      gate_enabled: boolean | null;
      password_hash: string | null;
    }>;

    const row = rows[0];
    const value: GateSettings = {
      // A missing row means "not configured yet" — stay locked.
      gateEnabled: row ? row.gate_enabled !== false : true,
      passwordHash: row?.password_hash ?? null,
    };

    settingsCache = { value, expiresAt: now + SETTINGS_CACHE_MS };
    return value;
  } catch {
    return FAILSAFE_SETTINGS;
  }
}

// ---------------------------------------------------------------------------
// Password hashing (PBKDF2-SHA256, Web Crypto)
// ---------------------------------------------------------------------------

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );

  return new Uint8Array(bits);
}

export async function hashGatePassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifyAgainstHash(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [scheme, iterationsRaw, saltB64, hashB64] = storedHash.split("$");
  if (scheme !== "pbkdf2" || !iterationsRaw || !saltB64 || !hashB64) {
    return false;
  }

  const iterations = Number.parseInt(iterationsRaw, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const derived = await pbkdf2(password, fromBase64(saltB64), iterations);
  return timingSafeEqual(derived, fromBase64(hashB64));
}

/**
 * Verifies a submitted password against the stored hash, falling back to the
 * `SOUND_FOR_FILMS_PASSWORD` env var when no hash has been configured yet.
 */
export async function verifyGatePassword(
  password: string,
  settings: GateSettings
): Promise<boolean> {
  if (!password) return false;

  if (settings.passwordHash) {
    return verifyAgainstHash(password, settings.passwordHash);
  }

  const envPassword = process.env.SOUND_FOR_FILMS_PASSWORD;
  if (!envPassword) return false;

  return timingSafeEqual(
    await pbkdf2(password, encoder.encode("env-fallback"), 1_000),
    await pbkdf2(envPassword, encoder.encode("env-fallback"), 1_000)
  );
}

// ---------------------------------------------------------------------------
// Session token (HMAC-SHA256)
// ---------------------------------------------------------------------------

async function getSigningKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(requiredEnv("SOUND_FOR_FILMS_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;

export async function createAccessToken(): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = String(expiresAt);
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getSigningKey(),
    encoder.encode(payload)
  );

  return `${payload}.${toBase64(new Uint8Array(signature))}`;
}

export async function verifyAccessToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signatureB64 = token.slice(separator + 1);

  const expiresAt = Number.parseInt(payload, 10);
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 <= Date.now()) {
    return false;
  }

  try {
    return await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(),
      fromBase64(signatureB64) as BufferSource,
      encoder.encode(payload)
    );
  } catch {
    return false;
  }
}
