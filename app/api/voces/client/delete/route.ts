import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureAdmin } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/client/delete/route.ts: clients ->
// voces_clients. Same discrepancy as /api/voces/client/list — not
// explicitly named in this batch's route list, but required by the ported
// app/voces/admin/clients/page.tsx (its "delete client" button).
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const { error } = await supabase.from("voces_clients").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
