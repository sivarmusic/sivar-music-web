import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Ported from voces-bds's app/api/cantantes/casting/upload-url/route.ts.
// Public (no auth): applicants upload their audio directly to Supabase
// Storage via a signed URL before submitting the apply form. Deliberately
// separate from app/api/voces/admin/cantantes/casting/upload-url/route.ts
// (ensureAdmin-gated, used by the admin panel) — an anonymous visitor can't
// call that one.
const BUCKET = "voces-casting-files";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ext = (searchParams.get("ext") || "mp3").replace(/[^a-zA-Z0-9]/g, "");
    const shareId = (searchParams.get("shareId") || "unknown").replace(/[^a-zA-Z0-9_-]/g, "");

    const path = `cantante-audios/${Date.now()}-${shareId}.${ext}`;
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
