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

  const hasClient = req.cookies.get("voces_client");
  const hasAdmin = req.cookies.get("voces_admin")?.value === "1";
  if (!hasClient && !hasAdmin) {
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

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /dashboard/* routes
  if (pathname.startsWith("/dashboard")) {
    return proxyDashboard(req, pathname);
  }

  if (pathname.startsWith("/sound-for-films")) {
    return proxySoundForFilms(req, pathname);
  }

  if (pathname.startsWith("/voces")) {
    return proxyVoces(req, pathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/sound-for-films/:path*", "/voces/:path*"],
};
