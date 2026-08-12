import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureAdmin } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/client/set-admin/route.ts: clients ->
// voces_clients. Flagged as skipped by an earlier batch, ported here.
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id, isAdmin: value } = await req.json().catch(() => ({}));
    if (!id || typeof value !== "boolean") {
      return NextResponse.json({ ok: false, error: "Missing params" }, { status: 400 });
    }

    const { data: client, error } = await supabase
      .from("voces_clients")
      .update({ is_admin: value })
      .eq("id", id)
      .select("id, email, name, is_admin")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, client: { id: client.id, email: client.email, name: client.name, isAdmin: !!client.is_admin } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
