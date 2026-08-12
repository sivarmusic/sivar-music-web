import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { updateApplicationAudioUrl } from "@/lib/voces-castings";

// Ported from voces-bds's app/api/admin/casting/application/update-audio/route.ts.
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  try {
    const { applicationId, audioUrl } = await req.json();
    if (!applicationId || !audioUrl) {
      return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });
    }

    await updateApplicationAudioUrl(applicationId, audioUrl);
    return NextResponse.json({ ok: true, audioUrl });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
