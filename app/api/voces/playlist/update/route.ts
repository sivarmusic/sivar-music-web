import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getClientIdFromRequest } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/playlist/update/route.ts: `playlists` -> `voces_playlists`.
function toPlaylist(row: any) {
  return { id: row.id, clientId: row.client_id, name: row.name, items: row.items ?? [], category: row.category ?? "locutor", shareId: row.share_id, createdAt: row.created_at };
}

export async function POST(req: NextRequest) {
  try {
    const clientId = getClientIdFromRequest(req);
    if (!clientId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    const body = await req.json().catch(() => null);
    const playlistId = body?.playlistId as string | undefined;
    const newName = typeof body?.name === "string" ? body.name.trim() : "";
    if (!playlistId || !newName) return NextResponse.json({ ok: false, error: "Missing data" }, { status: 400 });

    const { data, error } = await supabase
      .from("voces_playlists").update({ name: newName }).eq("id", playlistId).eq("client_id", clientId).select().single();
    if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "Not found" }, { status: 500 });

    return NextResponse.json({ ok: true, playlist: toPlaylist(data) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
