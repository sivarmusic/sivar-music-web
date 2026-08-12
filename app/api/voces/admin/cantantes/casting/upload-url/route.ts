import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { supabase } from "@/lib/supabase";

// Ported from voces-bds's app/api/cantantes/casting/upload-url/route.ts (GET,
// used by the results/[id] admin page for manual audio replace/add) merged
// with app/api/admin/upload-url/route.ts's POST handler (used by the
// admin/cantantes/casting create/edit page's direct-to-Supabase upload flow
// for video/script/reference/attachment files) — both targeted the same
// "casting-files" bucket in the original, so both live here together rather
// than reusing the already-ported app/api/voces/admin/upload-url/route.ts
// (a prior batch's POST, folder-based endpoint that targets voces-talent-files
// for cantante profile demo uploads — a different bucket/purpose).
const BUCKET = "voces-casting-files";

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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

const VALID_FOLDERS = new Set(["cantante-videos", "cantante-scripts", "cantante-refs", "cantante-audios"]);

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const { filename, folder, mimeType } = await req.json();
    if (!VALID_FOLDERS.has(folder)) return NextResponse.json({ ok: false, error: "Invalid folder" }, { status: 400 });
    void mimeType; // accepted for parity with the original payload shape; unused by createSignedUploadUrl

    const safeName = `${Date.now()}-${String(filename || "file").replace(/[^a-zA-Z0-9._-]+/g, "_")}`;
    const storagePath = `${folder}/${safeName}`;

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(storagePath);
    if (error) throw new Error(error.message);

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    return NextResponse.json({ ok: true, signedUrl: data.signedUrl, publicUrl: pub.publicUrl });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? "Error" }, { status: 500 });
  }
}
