import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getClientIdFromRequest } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/playlist/share/route.ts: `playlists` -> `voces_playlists`,
// share URL prefix /s/ -> /voces/s/ (this repo's /voces/* section).
function toPlaylist(row: any) {
  return { id: row.id, clientId: row.client_id, name: row.name, items: row.items ?? [], category: row.category ?? "locutor", shareId: row.share_id, createdAt: row.created_at };
}

function uid() {
  return "sh_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  const clientId = getClientIdFromRequest(req);
  if (!clientId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { playlistId } = await req.json().catch(() => ({} as any));

  const { data: pl, error: fetchErr } = await supabase
    .from("voces_playlists").select().eq("id", playlistId).eq("client_id", clientId).single();
  if (fetchErr || !pl) return NextResponse.json({ ok: false, error: "Playlist not found" }, { status: 404 });

  let shareId = pl.share_id;
  if (!shareId) {
    shareId = uid();
    const { error } = await supabase.from("voces_playlists").update({ share_id: shareId }).eq("id", playlistId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, shareId, url: `/voces/s/${shareId}` });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const { data, error } = await supabase
    .from("voces_playlists").select().eq("share_id", id).single();
  if (error || !data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, playlist: toPlaylist(data) });
}
