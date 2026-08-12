import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getClientIdFromRequest } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/playlist/by-id/route.ts: `playlists` -> `voces_playlists`.
function toPlaylist(row: any) {
  return { id: row.id, clientId: row.client_id, name: row.name, items: row.items ?? [], category: row.category ?? "locutor", shareId: row.share_id, createdAt: row.created_at };
}

export async function GET(req: NextRequest) {
  const clientId = getClientIdFromRequest(req);
  if (!clientId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const { data, error } = await supabase
    .from("voces_playlists").select().eq("id", id).eq("client_id", clientId).single();
  if (error || !data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, playlist: toPlaylist(data) });
}
