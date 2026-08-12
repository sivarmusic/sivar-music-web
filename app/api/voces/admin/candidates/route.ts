import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureAdmin, getClientIdFromRequest } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/admin/candidates/route.ts: readStore()/
// writeStore() playlists array -> voces_playlists table.
//
// Serves the LOCUTOR casting flow only: this endpoint (and its twin,
// ../candidates/share/route.ts) exist to let an admin share a hand-picked
// list of candidate locutores as a read-only playlist link. In the original
// codebase this exact route (without /share) has no caller — only
// app/admin/casting/candidates/[id]/page.tsx's "Compartir seleccionados"
// button calls /api/admin/candidates/share — so it's ported here unused too,
// for parity; the cantante candidates page has no equivalent share feature.
//
// voces_playlists.client_id is `NOT NULL REFERENCES voces_clients(id)`
// (unlike the original's schema-less store.json, where `clientId: "admin"`
// was just an arbitrary string), so the shared playlist is owned by the
// requesting admin's own client row instead of a literal "admin" placeholder.
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const clientId = getClientIdFromRequest(req);
    if (!clientId) return NextResponse.json({ ok: false, error: "No se pudo identificar al admin" }, { status: 401 });

    const { name, items } = await req.json().catch(() => ({}));
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, error: "Sin items" }, { status: 400 });
    }

    const id = `pl_${randomUUID()}`;
    const shareId = `sh_${randomUUID()}`;
    const { error } = await supabase.from("voces_playlists").insert({
      id,
      client_id: clientId,
      name: String(name || "Candidatos"),
      items,
      category: "locutor",
      share_id: shareId,
    });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, shareId, url: `/voces/s/${shareId}` });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
