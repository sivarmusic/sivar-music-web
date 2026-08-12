import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureAdmin, hashPassword } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/client/reset-password/route.ts: clients ->
// voces_clients, bcrypt.hash inlined there -> hashPassword() (lib/voces-auth.ts).
// Admin resets another client's password by id. Flagged as skipped by an
// earlier batch, ported here.
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id, password } = await req.json();
  if (!id || !password) return NextResponse.json({ ok: false, error: "Missing params" }, { status: 400 });

  const passwordHash = await hashPassword(String(password));
  const { error } = await supabase.from("voces_clients").update({ password_hash: passwordHash }).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
