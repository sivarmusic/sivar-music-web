import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { getClientIdFromRequest } from "@/lib/voces-auth";

// Security fix (2026-08-26): this route used to return `id`/`clientId` in the
// PUBLIC, unauthenticated GET response, and generate `shareId` with
// Math.random()+Date.now() instead of a CSPRNG. That let anyone with a shared
// playlist link read the owner's raw `clientId` — and since `voces_client` is
// an unsigned cookie (see lib/voces-auth.ts), that id alone was enough to
// impersonate the owner, admin panel included if they were an admin. Same
// vulnerability class voces-bds's commit 99d15ef fixed for the equivalent
// route there.
//
// Fix: the public projection below only returns fields the share view
// actually renders (name/items/category/createdAt) — no id, no clientId. New
// shareIds use crypto.randomUUID() (matches the CSPRNG pattern already used
// everywhere else in this codebase, e.g. lib/voces-castings.ts's
// `cs_${randomUUID()}`), not a mechanism to guess. Existing playlists that
// already have a weak share_id keep it until backfilled — see
// scripts/voces-backfill-playlist-share-ids.mjs.
function toPublicPlaylist(row: any) {
  return {
    name: row.name,
    items: row.items ?? [],
    category: row.category ?? "locutor",
    createdAt: row.created_at,
  };
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
    shareId = `sh_${randomUUID()}`;
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

  return NextResponse.json({ ok: true, playlist: toPublicPlaylist(data) });
}
