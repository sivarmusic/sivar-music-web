import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureAdmin } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/admin/reel-requests/reject/route.ts:
// reel_update_requests -> voces_reel_update_requests, "talent-files" bucket
// -> "voces-talent-files".
const BUCKET = "voces-talent-files";

function storagePathFromPublicUrl(url: string): string | null {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id, notes } = await req.json();
    if (!id) {
      return NextResponse.json({ ok: false, error: "Falta el id" }, { status: 400 });
    }

    const { data: reqRow } = await supabase
      .from("voces_reel_update_requests")
      .select("id, status, new_audio_url")
      .eq("id", id)
      .maybeSingle();

    if (!reqRow) return NextResponse.json({ ok: false, error: "Solicitud no encontrada" }, { status: 404 });
    if (reqRow.status !== "pending") {
      return NextResponse.json({ ok: false, error: "La solicitud ya fue procesada" }, { status: 400 });
    }

    const path = storagePathFromPublicUrl(reqRow.new_audio_url);
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    }

    const { error } = await supabase
      .from("voces_reel_update_requests")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
      })
      .eq("id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
