import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getClientIdFromRequest } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/playlist/add/route.ts: `playlists` -> `voces_playlists`.
function uid() {
  return "pi_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function toPlaylist(row: any) {
  return { id: row.id, clientId: row.client_id, name: row.name, items: row.items ?? [], category: row.category ?? "locutor", shareId: row.share_id, createdAt: row.created_at };
}

export async function POST(req: NextRequest) {
  try {
    const clientId = getClientIdFromRequest(req);
    if (!clientId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    const body = await req.json();
    const item = body?.item;
    const playlistId: string | undefined = body?.playlistId;
    if (!item || !item.nombre) return NextResponse.json({ ok: false, error: "Missing item" }, { status: 400 });
    if (!playlistId) return NextResponse.json({ ok: false, error: "Missing playlistId" }, { status: 400 });

    const { data: pl, error: fetchErr } = await supabase
      .from("voces_playlists").select().eq("id", playlistId).eq("client_id", clientId).single();
    if (fetchErr || !pl) return NextResponse.json({ ok: false, error: "Playlist not found" }, { status: 404 });

    // Evita agregar el mismo integrante dos veces (mismo cantante o mismo nombre).
    const keyOf = (it: any) => it?.cantanteId || (it?.nombre || "").trim().toLowerCase();
    const newKey = keyOf(item);
    const existing = pl.items ?? [];
    if (newKey && existing.some((it: any) => keyOf(it) === newKey)) {
      return NextResponse.json({ ok: true, duplicate: true, playlist: toPlaylist(pl) });
    }

    const newItem = { ...item, id: item.id || uid() };
    const updatedItems = [...existing, newItem];

    const { data: updated, error: updateErr } = await supabase
      .from("voces_playlists").update({ items: updatedItems }).eq("id", playlistId).select().single();
    if (updateErr) return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, playlist: toPlaylist(updated) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
