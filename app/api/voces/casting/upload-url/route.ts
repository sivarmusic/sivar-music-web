import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { safeAudioExt, safeShareId } from "@/lib/voces-upload-guards";

// Ported from voces-bds's app/api/casting/upload-url/route.ts. Public (no
// auth): applicants upload their audio directly to Supabase Storage via a
// signed URL before submitting the apply form. Deliberately separate from
// app/api/voces/admin/casting/upload-url/route.ts (which is ensureAdmin-gated
// and used by the admin panel) — an anonymous visitor can't call that one.
const BUCKET = "voces-casting-files";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ext = safeAudioExt(searchParams.get("ext"));
    if (!ext) return NextResponse.json({ ok: false, error: "Extensión no permitida" }, { status: 400 });
    const shareId = safeShareId(searchParams.get("shareId"));
    if (!shareId) return NextResponse.json({ ok: false, error: "shareId inválido" }, { status: 400 });

    const { data: casting } = await supabase
      .from("voces_castings")
      .select("id")
      .eq("share_id", shareId)
      .maybeSingle();
    if (!casting) return NextResponse.json({ ok: false, error: "Casting inexistente" }, { status: 404 });

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
