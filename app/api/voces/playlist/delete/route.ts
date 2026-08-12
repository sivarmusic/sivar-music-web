import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getClientIdFromRequest } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/playlist/delete/route.ts: `playlists` -> `voces_playlists`.
export async function POST(req: NextRequest) {
  try {
    const clientId = getClientIdFromRequest(req);
    if (!clientId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    const body = await req.json().catch(() => null);
    const playlistId = body?.playlistId as string | undefined;
    if (!playlistId) return NextResponse.json({ ok: false, error: "Missing playlistId" }, { status: 400 });

    const { error } = await supabase
      .from("voces_playlists").delete().eq("id", playlistId).eq("client_id", clientId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, playlistId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
