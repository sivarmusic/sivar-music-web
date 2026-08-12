import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { supabase } from "@/lib/supabase";
import { deleteApplication } from "@/lib/voces-castings";

// Ported from voces-bds's app/api/admin/casting/application/delete/route.ts.
//  - Drive dependency removed: the original's `purgeRemote` branch called
//    lib/google-drive's deleteFile() for applications whose audioUrl was a
//    legacy "/api/demo?id=..." Drive-proxy link. That proxy doesn't exist in
//    this repo — all casting audio lives in the voces-casting-files Supabase
//    Storage bucket — so purgeRemote now removes the object from that bucket
//    instead (same best-effort, non-blocking behavior as
//    app/api/voces/admin/trash/purge/route.ts's storagePathFromPublicUrl).
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
  try {
    const ct = req.headers.get("content-type") || "";
    let id = "";
    let purgeRemote = false;
    let audioUrl = "";
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({} as any));
      id = String(body.id || "").trim();
      purgeRemote = !!body.purgeRemote;
      audioUrl = String(body.audioUrl || "");
    } else {
      const fd = await req.formData();
      id = String(fd.get("id") || "").trim();
      purgeRemote = String(fd.get("purgeRemote") || "").toLowerCase() === "true";
      audioUrl = String(fd.get("audioUrl") || "");
    }
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    await deleteApplication(id);

    if (purgeRemote && audioUrl) {
      const path = storagePathFromPublicUrl(audioUrl);
      if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    }

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
