import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureAdmin, getClientIdFromRequest } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/admin/candidates/share/route.ts (byte-identical
// to ../route.ts in the original). This is the one actually called —
// app/voces/admin/casting/candidates/[id]/page.tsx's "Compartir seleccionados"
// button — for the LOCUTOR casting candidates flow. See ../route.ts's comment
// for why client_id resolves to the requesting admin's own client row.
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
