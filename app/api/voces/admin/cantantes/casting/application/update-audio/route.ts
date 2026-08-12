import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { updateCantanteApplicationAudioUrl } from "@/lib/voces-castings-cantantes";

// Ported from voces-bds's app/api/admin/cantantes/casting/application/update-audio/route.ts.
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const { applicationId, audioUrl, originalLink } = await req.json().catch(() => ({}));
    if (!applicationId || !audioUrl) {
      return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
    }
    await updateCantanteApplicationAudioUrl(applicationId, audioUrl, originalLink);
    return NextResponse.json({ ok: true, audioUrl });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
