import { NextRequest, NextResponse } from "next/server";
import { getCreatorBySlug } from "@/lib/creators";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /dashboard/* routes
  if (pathname.startsWith("/dashboard")) {
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
      return NextResponse.redirect(
        new URL(`/dashboard/${session}`, req.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
