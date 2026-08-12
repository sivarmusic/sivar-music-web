import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureAdmin } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/admin/trash/purge/route.ts:
//  - readStore()/writeStore() -> voces_trash table.
//  - File cleanup: the original deleted local /public/casting/* files (a
//    legacy on-disk storage path) or, for Google Drive-hosted audio, called
//    lib/google-drive's deleteFile. Neither applies anymore — casting files
//    now live in the voces-casting-files Supabase Storage bucket, so this
//    best-effort removes objects there instead, based on public-URL paths
//    recorded in `files` (casting) or `application.audioUrl` (application).
const BUCKET = "voces-casting-files";

function storagePathFromPublicUrl(url: string): string | null {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const ct = req.headers.get("content-type") || "";
  let id = "";
  if (ct.includes("application/json")) {
    const body = await req.json().catch(() => ({} as any));
    id = String((body as any).id || "").trim();
  } else {
    const fd = await req.formData();
    id = String(fd.get("id") || "").trim();
  }
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const { data: item, error: fetchError } = await supabase
    .from("voces_trash")
    .select("id, type, files, application")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  if (!item) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  try {
    if (item.type === "casting") {
      const paths = (Array.isArray(item.files) ? item.files : [])
        .map((f: string) => storagePathFromPublicUrl(f))
        .filter((p: string | null): p is string => !!p);
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths).catch(() => {});
    } else if (item.type === "application") {
      const url = (item.application as any)?.audioUrl as string | undefined;
      const path = url ? storagePathFromPublicUrl(url) : null;
      if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    }
  } catch {
    // Best-effort cleanup; never block the purge on a storage error.
  }

  const { error: deleteError } = await supabase.from("voces_trash").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
