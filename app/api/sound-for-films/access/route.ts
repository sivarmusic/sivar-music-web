import { NextRequest, NextResponse } from "next/server";
import {
  GATE_COOKIE,
  SESSION_MAX_AGE,
  createAccessToken,
  getGateSettings,
  verifyGatePassword,
} from "@/lib/sound-for-films-gate";

/** Coarse per-IP throttle — the gate is a single shared password. */
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || entry.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

function clearAttempts(ip: string) {
  attempts.delete(ip);
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
      { status: 429 }
    );
  }

  let password = "";
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const settings = await getGateSettings();

  if (!settings.gateEnabled) {
    return NextResponse.json({ ok: true });
  }

  if (typeof password !== "string" || !(await verifyGatePassword(password, settings))) {
    return NextResponse.json(
      { error: "Contraseña incorrecta" },
      { status: 401 }
    );
  }

  clearAttempts(ip);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(GATE_COOKIE, await createAccessToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
