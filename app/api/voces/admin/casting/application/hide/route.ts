import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { setApplicationHidden } from "@/lib/voces-castings";

// Ported from voces-bds's app/api/admin/casting/application/hide/route.ts.
// Distinct from application/select: "hidden" removes a postulación from the
// public results link (/voces/r/[id]) without deleting it or affecting the
// "selected" (elegido) status.
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  try {
    const { applicationId, hidden } = await req.json();
    if (!applicationId || typeof hidden !== "boolean") {
      return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });
    }

    await setApplicationHidden(applicationId, hidden);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
