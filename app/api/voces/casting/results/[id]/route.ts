import { NextRequest, NextResponse } from "next/server";
import { getCasting, getApplications } from "@/lib/voces-castings";

// Ported from voces-bds's app/api/casting/results/[id]/route.ts. Public (no
// auth, matching the original top-level, non-/admin/ route): backs the
// public "share the results" link (/voces/r/[id]). Deliberately separate
// from app/api/voces/admin/casting/results/[id]/route.ts (ensureAdmin-gated,
// used by the admin panel) — an anonymous visitor can't call that one.
// `?public=1` (always sent by the /voces/r/[id] page) strips email/phone
// from each application, exactly like the original.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: shareId } = await params;
    const casting = await getCasting({ shareId });
    if (!casting) return NextResponse.json({ ok: false, error: "Casting not found" }, { status: 404 });
    const applications = await getApplications({ shareId });
    const isPublic = req.nextUrl.searchParams.get("public") === "1";
    const safeApplications = isPublic
      ? applications.map(({ email: _e, phone: _p, ...rest }: any) => rest)
      : applications;
    return NextResponse.json({
      ok: true,
      casting: { id: casting.id, title: casting.title || "", createdAt: casting.createdAt, shareId: casting.shareId },
      applications: safeApplications,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
