import { NextRequest, NextResponse } from "next/server";
import { getCantanteCasting, getCantanteApplications } from "@/lib/voces-castings-cantantes";

// Ported from voces-bds's app/api/admin/cantantes/casting/results/[id]/route.ts,
// but PUBLIC-ONLY (no ensureAdmin branch): the original served both the admin
// panel and the public /cr/[id] results page from that one route via a
// `?public=1` bypass. This repo's batch 4b already ported that file as
// app/api/voces/admin/cantantes/casting/results/[id]/route.ts, but always
// requires ensureAdmin() there (no public bypass) — so it can't back an
// anonymous /voces/cr/[id] visitor. Rather than reopen that admin-scoped
// file, this is a new, always-public route (mirroring how the locutor side
// already keeps its public results endpoint, app/api/voces/casting/results/[id],
// separate from the admin one). `?public=1` (always sent by the
// /voces/cr/[id] page) strips email/phone from each application.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: shareId } = await params;
    const casting = await getCantanteCasting({ shareId });
    if (!casting) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    const applications = await getCantanteApplications({ shareId });

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
