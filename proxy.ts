import { NextRequest, NextResponse } from "next/server";
import { getCreatorBySlug } from "@/lib/creators";
import {
  GATE_ACCESS_PATH,
  GATE_COOKIE,
  getGateSettings,
  verifyAccessToken,
} from "@/lib/sound-for-films-gate";

/**
 * Sound for Films is shared by link, never through search. Keep it out of
 * every index regardless of whether the password gate is currently on.
 */
const NOINDEX = "noindex, nofollow, noimageindex, noarchive, nosnippet";

function withNoindex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", NOINDEX);
  return response;
}

function proxyDashboard(req: NextRequest, pathname: string) {
  const session = req.cookies.get("creator_session")?.value;

  if (!session) {
    return NextResponse.redirect(new URL("/members", req.url));
  }

  const creator = getCreatorBySlug(session);
  if (!creator) {
    const res = NextResponse.redirect(new URL("/members", req.url));
    res.cookies.set("creator_session", "", { maxAge: 0, path: "/" });
    return res;
  }

  // Each creator can only access their own dashboard
  const requestedSlug = pathname.split("/")[2];
  if (requestedSlug && requestedSlug !== session) {
    return NextResponse.redirect(new URL(`/dashboard/${session}`, req.url));
  }

  return NextResponse.next();
}

const VOCES_PUBLIC_PREFIXES = [
  "/voces/login",
  "/voces/admin",
  "/voces/s/",
  "/voces/r/",
  "/voces/c/",
  "/voces/cc/",
  "/voces/cr/",
  "/voces/reporte/",
  "/voces/actualizar-reel",
];

function proxyVoces(req: NextRequest, pathname: string) {
  if (VOCES_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Esto es un redirect de UX, NO un control de seguridad: solo mira que
  // exista la cookie, sin verificar firma — no puede hacer más, corre en
  // Edge, donde no hay acceso a la base. La autorización real la hace cada
  // endpoint y cada página con getSession()/getAdmin() (lib/voces-session.ts),
  // que sí verifican firma y consultan la fila.
  //
  // Corte cerrado (2026-08-26): ya no se acepta la cookie legacy voces_client
  // acá — se confirmó que todos los usuarios reales entraron al menos una vez
  // con la sesión nueva. voces_session es la única cookie que importa.
  const hasSession = req.cookies.get("voces_session");
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/voces/login";
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

async function proxySoundForFilms(req: NextRequest, pathname: string) {
  // The access screen and the admin toggle must stay reachable while locked.
  if (
    pathname === GATE_ACCESS_PATH ||
    pathname.startsWith("/sound-for-films/admin")
  ) {
    return withNoindex(NextResponse.next());
  }

  const settings = await getGateSettings();

  if (!settings.gateEnabled) {
    return withNoindex(NextResponse.next());
  }

  const token = req.cookies.get(GATE_COOKIE)?.value;
  if (await verifyAccessToken(token)) {
    return withNoindex(NextResponse.next());
  }

  const accessUrl = req.nextUrl.clone();
  accessUrl.pathname = GATE_ACCESS_PATH;
  accessUrl.search = "";

  const response = NextResponse.redirect(accessUrl);

  // Drop an expired or tampered cookie so the form starts from a clean state.
  if (token) response.cookies.delete(GATE_COOKIE);

  return withNoindex(response);
}

/**
 * Defensa en profundidad para /eventos/admin/**: redirige al login si no hay
 * ninguna cookie de sesión de staff. NO es un control de seguridad (solo mira
 * presencia, sin verificar firma): la autorización real la hacen las APIs con
 * verifyStaffSession / verifyAdminSession.
 */
export function proxyEventosAdmin(req: NextRequest, pathname: string) {
  if (pathname === "/eventos/admin/login") return NextResponse.next();

  const hasSession =
    req.cookies.get("pf_admin_token") || req.cookies.get("pf_admin_refresh");
  if (hasSession) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/eventos/admin/login";
  url.search = "";
  url.searchParams.set("redirect", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /dashboard/* routes
  if (pathname.startsWith("/dashboard")) {
    return proxyDashboard(req, pathname);
  }

  if (pathname.startsWith("/sound-for-films")) {
    return proxySoundForFilms(req, pathname);
  }

  if (pathname.startsWith("/eventos/admin")) {
    return proxyEventosAdmin(req, pathname);
  }

  if (pathname.startsWith("/voces")) {
    return proxyVoces(req, pathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/sound-for-films/:path*", "/voces/:path*", "/eventos/admin/:path*"],
};
