import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getClientIdFromRequest } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/playlist/remove-item/route.ts: `playlists` -> `voces_playlists`.
function toPlaylist(row: any) {
  return { id: row.id, clientId: row.client_id, name: row.name, items: row.items ?? [], category: row.category ?? "locutor", shareId: row.share_id, createdAt: row.created_at };
}

export async function POST(req: NextRequest) {
  try {
    const clientId = getClientIdFromRequest(req);
    if (!clientId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    const body = await req.json().catch(() => null);
    const playlistId = body?.playlistId as string | undefined;
    const itemId = body?.itemId as string | undefined;
    const index = typeof body?.index === "number" ? body.index : undefined;
    if (!playlistId) return NextResponse.json({ ok: false, error: "Missing playlistId" }, { status: 400 });

    const { data: pl, error: fetchErr } = await supabase
      .from("voces_playlists").select().eq("id", playlistId).eq("client_id", clientId).single();
    if (fetchErr || !pl) return NextResponse.json({ ok: false, error: "Playlist not found" }, { status: 404 });

    let items: any[] = pl.items ?? [];
    let removed = false;

    if (itemId) {
      const idx = items.findIndex((it: any) => it.id === itemId);
      if (idx !== -1) { items = items.filter((_: any, i: number) => i !== idx); removed = true; }
    }
    if (!removed && typeof index === "number" && index >= 0 && index < items.length) {
      items = items.filter((_: any, i: number) => i !== index);
      removed = true;
    }
    if (!removed) return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });

    const { data: updated, error: updateErr } = await supabase
      .from("voces_playlists").update({ items }).eq("id", playlistId).select().single();
    if (updateErr) return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, playlist: toPlaylist(updated) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
