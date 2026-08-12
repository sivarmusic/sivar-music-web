import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { updateCantanteApplicationAudioUrl, uploadCantanteCastingFile } from "@/lib/voces-castings-cantantes";

// Ported from voces-bds's app/api/admin/cantantes/casting/application/import-audio/route.ts.
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const { applicationId, audioUrl: externalUrl } = await req.json().catch(() => ({}));
    if (!applicationId || !externalUrl) {
      return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
    }

    const fetchRes = await fetch(externalUrl);
    if (!fetchRes.ok) throw new Error(`No se pudo descargar el audio: HTTP ${fetchRes.status}`);
    const buf = Buffer.from(await fetchRes.arrayBuffer());
    const contentType = fetchRes.headers.get("content-type") || "audio/mpeg";
    const ext = contentType.includes("ogg") ? "ogg" : contentType.includes("wav") ? "wav" : "mp3";

    const storedUrl = await uploadCantanteCastingFile(buf, contentType, `imported.${ext}`, "cantante-audios");
    await updateCantanteApplicationAudioUrl(applicationId, storedUrl, externalUrl);

    return NextResponse.json({ ok: true, audioUrl: storedUrl });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
