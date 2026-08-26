import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionClientId } from "@/lib/voces-session";

// Ported from voces-bds's app/api/playlist/list/route.ts: `playlists` -> `voces_playlists`.
function toPlaylist(row: any) {
  return { id: row.id, clientId: row.client_id, name: row.name, items: row.items ?? [], category: row.category ?? "locutor", shareId: row.share_id, createdAt: row.created_at };
}

export async function GET(req: NextRequest) {
  const clientId = await getSessionClientId(req);
  if (!clientId) return NextResponse.json({ ok: true, playlists: [] });
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") === "cantante" ? "cantante" : "locutor";

  const { data, error } = await supabase
    .from("voces_playlists")
    .select()
    .eq("client_id", clientId)
    .neq("name", "Mi lista")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Filtramos por categoría en memoria para tolerar bases sin la columna todavía
  // (los proyectos antiguos sin categoría cuentan como "locutor").
  const rows = (data ?? []).map(toPlaylist).filter((p) => p.category === category);
  return NextResponse.json({ ok: true, playlists: rows });
}
