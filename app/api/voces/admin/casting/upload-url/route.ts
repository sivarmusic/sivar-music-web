import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { supabase } from "@/lib/supabase";

// Ported from voces-bds's app/api/casting/upload-url/route.ts (GET,
// ext+shareId query params -> signed upload URL), used by the results/[id]
// admin page for manual "reemplazar audio" / "agregar postulación manual"
// uploads. Not explicitly listed in the batch 4b route table, but required
// for those ported pages to work — added here rather than reusing the
// existing app/api/voces/admin/upload-url/route.ts (a prior batch's POST,
// folder-based endpoint that targets the voces-talent-files bucket for
// cantante profile demo uploads) so casting attachments land in
// voces-casting-files per this batch's explicit bucket instruction.
const BUCKET = "voces-casting-files";

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const ext = (searchParams.get("ext") || "mp3").replace(/[^a-zA-Z0-9]/g, "");
    const shareId = (searchParams.get("shareId") || "unknown").replace(/[^a-zA-Z0-9_-]/g, "");

    const path = `audios/${Date.now()}-${shareId}.${ext}`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);

    if (error || !data) {
      return NextResponse.json({ ok: false, error: error?.message || "No se pudo generar URL" }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({ ok: true, signedUrl: data.signedUrl, path, publicUrl: pub.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
