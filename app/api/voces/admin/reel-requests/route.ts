import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureAdmin } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/admin/reel-requests/route.ts:
// talents/talent_media/reel_update_requests -> voces_ prefixed tables.
export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";

    const { data: requests, error } = await supabase
      .from("voces_reel_update_requests")
      .select("id, created_at, status, talent_id, email, mode, target_kind, target_media_id, new_audio_url, new_audio_filename, reviewed_at, review_notes")
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    if (!requests || requests.length === 0) {
      return NextResponse.json({ ok: true, requests: [] });
    }

    const talentIds = Array.from(new Set(requests.map((r) => r.talent_id)));
    const targetIds = requests.map((r) => r.target_media_id).filter(Boolean) as string[];

    const { data: talents } = await supabase
      .from("voces_talents")
      .select("id, full_name, email")
      .in("id", talentIds);

    const talentMap = new Map<string, { full_name: string; email: string }>();
    for (const t of talents ?? []) {
      talentMap.set(t.id, { full_name: t.full_name, email: t.email });
    }

    let mediaMap = new Map<string, { url: string; kind: string }>();
    if (targetIds.length > 0) {
      const { data: media } = await supabase
        .from("voces_talent_media")
        .select("id, url, kind")
        .in("id", targetIds);
      for (const m of media ?? []) {
        mediaMap.set(m.id, { url: m.url, kind: m.kind });
      }
    }

    const enriched = requests.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      status: r.status,
      talentId: r.talent_id,
      talentName: talentMap.get(r.talent_id)?.full_name || "",
      email: r.email,
      mode: r.mode,
      targetKind: r.target_kind,
      targetMediaId: r.target_media_id,
      previousAudioUrl: r.target_media_id ? mediaMap.get(r.target_media_id)?.url || null : null,
      newAudioUrl: r.new_audio_url,
      newAudioFilename: r.new_audio_filename,
    }));

    return NextResponse.json({ ok: true, requests: enriched });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
