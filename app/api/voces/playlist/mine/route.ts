import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getClientIdFromRequest } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/playlist/mine/route.ts: `playlists` -> `voces_playlists`.
function uid() {
  return "pl_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function toPlaylist(row: any) {
  return { id: row.id, clientId: row.client_id, name: row.name, items: row.items ?? [], shareId: row.share_id, createdAt: row.created_at };
}

export async function GET(req: NextRequest) {
  const clientId = getClientIdFromRequest(req);
  if (!clientId) return NextResponse.json({ ok: true, playlist: null });

  const { data: existing } = await supabase
    .from("voces_playlists").select().eq("client_id", clientId).eq("name", "Mi lista").single();
  if (existing) return NextResponse.json({ ok: true, playlist: toPlaylist(existing) });

  const newPl = { id: uid(), client_id: clientId, name: "Mi lista", items: [], created_at: new Date().toISOString() };
  const { data, error } = await supabase.from("voces_playlists").insert(newPl).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, playlist: toPlaylist(data) });
}
