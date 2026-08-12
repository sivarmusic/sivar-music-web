import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getClientIdFromRequest } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/playlist/create/route.ts: `playlists` -> `voces_playlists`.
function uid() {
  return "pl_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function toPlaylist(row: any) {
  return { id: row.id, clientId: row.client_id, name: row.name, items: row.items ?? [], category: row.category ?? "locutor", shareId: row.share_id, createdAt: row.created_at };
}

export async function POST(req: NextRequest) {
  const clientId = getClientIdFromRequest(req);
  if (!clientId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { name, category } = await req.json();
  const cat = category === "cantante" ? "cantante" : "locutor";
  const pl = { id: uid(), client_id: clientId, name: String(name || "Project"), items: [], category: cat, created_at: new Date().toISOString() };

  let { data, error } = await supabase.from("voces_playlists").insert(pl).select().single();
  // Si la columna category aún no existe en la base, reintentar sin ella.
  if (error && /category/i.test(error.message)) {
    const { category: _omit, ...rest } = pl;
    ({ data, error } = await supabase.from("voces_playlists").insert(rest).select().single());
  }
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, playlist: toPlaylist(data) });
}
