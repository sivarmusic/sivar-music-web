import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureAdmin } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/admin/upload-url/route.ts: "casting-files"
// bucket -> "voces-talent-files" (already provisioned in
// scripts/voces-schema.sql, no on-demand createBucket needed here).
const VALID_FOLDERS = new Set([
  "cantante-audios", "cantante-videos", "cantante-scripts", "cantante-refs",
  "audios", "videos", "scripts", "refs",
]);

const BUCKET = "voces-talent-files";

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const { filename, folder, mimeType } = await req.json();
    if (!VALID_FOLDERS.has(folder)) return NextResponse.json({ ok: false, error: "Invalid folder" }, { status: 400 });
    void mimeType; // accepted for parity with the original payload shape; unused by createSignedUploadUrl

    const safeName = `${Date.now()}-${String(filename || "file").replace(/[^a-zA-Z0-9._-]+/g, "_")}`;
    const storagePath = `${folder}/${safeName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error) throw new Error(error.message);

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    return NextResponse.json({ ok: true, signedUrl: data.signedUrl, publicUrl: pub.publicUrl });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? "Error" }, { status: 500 });
  }
}
