import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Ported from voces-bds's app/api/registro/upload-url/route.ts.
// Confirmed no Google Drive dependency here — this is a direct Supabase
// Storage signed-upload-URL flow. Bucket renamed talent-files -> the
// already-provisioned voces-talent-files bucket (see scripts/voces-schema.sql).
const BUCKET = "voces-talent-files";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ext = (searchParams.get("ext") || "mp3").replace(/[^a-zA-Z0-9]/g, "");
    const kind = (searchParams.get("kind") || "demo").replace(/[^a-zA-Z0-9_-]/g, "");

    const path = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);

    if (error || !data) {
      return NextResponse.json({ ok: false, error: error?.message || "No se pudo generar URL" }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ ok: true, signedUrl: data.signedUrl, publicUrl: pub.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
