import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureAdmin } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/admin/reel-requests/approve/route.ts:
// talent_media/reel_update_requests -> voces_ prefixed tables,
// "talent-files" bucket -> "voces-talent-files".
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
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ ok: false, error: "Falta el id" }, { status: 400 });
    }

    const { data: reqRow, error: reqErr } = await supabase
      .from("voces_reel_update_requests")
      .select("id, status, talent_id, mode, target_kind, target_media_id, new_audio_url")
      .eq("id", id)
      .maybeSingle();

    if (reqErr) throw new Error(reqErr.message);
    if (!reqRow) return NextResponse.json({ ok: false, error: "Solicitud no encontrada" }, { status: 404 });
    if (reqRow.status !== "pending") {
      return NextResponse.json({ ok: false, error: "La solicitud ya fue procesada" }, { status: 400 });
    }

    if (reqRow.mode === "replace") {
      if (!reqRow.target_media_id) {
        return NextResponse.json({ ok: false, error: "Falta el demo a reemplazar" }, { status: 400 });
      }

      const { data: oldMedia } = await supabase
        .from("voces_talent_media")
        .select("id, url")
        .eq("id", reqRow.target_media_id)
        .maybeSingle();

      const { error: updErr } = await supabase
        .from("voces_talent_media")
        .update({ url: reqRow.new_audio_url })
        .eq("id", reqRow.target_media_id);

      if (updErr) throw new Error(updErr.message);

      if (oldMedia?.url && oldMedia.url !== reqRow.new_audio_url) {
        const oldPath = storagePathFromPublicUrl(oldMedia.url);
        if (oldPath) {
          await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});
        }
      }
    } else if (reqRow.mode === "add") {
      const { data: existing } = await supabase
        .from("voces_talent_media")
        .select("id, kind, sort_order")
        .eq("talent_id", reqRow.talent_id)
        .in("kind", ["voice_demo", "voice_demo_2"]);

      const hasMain = (existing ?? []).some((m) => m.kind === "voice_demo");
      const hasSecond = (existing ?? []).some((m) => m.kind === "voice_demo_2");

      let kind = "voice_demo_2";
      let sortOrder = 2;
      if (!hasMain) {
        kind = "voice_demo";
        sortOrder = 1;
      } else if (hasSecond) {
        return NextResponse.json({ ok: false, error: "Ya existen dos demos. El locutor debería reemplazar uno." }, { status: 400 });
      }

      const { error: insErr } = await supabase
        .from("voces_talent_media")
        .insert({
          talent_id: reqRow.talent_id,
          kind,
          url: reqRow.new_audio_url,
          sort_order: sortOrder,
        });

      if (insErr) throw new Error(insErr.message);
    } else {
      return NextResponse.json({ ok: false, error: "Modo inválido" }, { status: 400 });
    }

    const { error: markErr } = await supabase
      .from("voces_reel_update_requests")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (markErr) throw new Error(markErr.message);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
