import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { ensureAdmin, hashPassword } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/admin/register/route.ts: clients ->
// voces_clients, bcrypt.hash inlined there -> hashPassword() (lib/voces-auth.ts).
// Dropped lib/store.ts's uid("adm") id generator (store.json is gone) in
// favor of a plain randomUUID with the same "adm_" prefix convention.
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { email, name, password } = await req.json();
  if (!email || !password) return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });

  const { data: existing } = await supabase
    .from("voces_clients")
    .select("id")
    .ilike("email", String(email).trim())
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: false, error: "Admin already exists" }, { status: 409 });

  const passwordHash = await hashPassword(String(password));
  const id = `adm_${randomUUID()}`;

  const { error } = await supabase
    .from("voces_clients")
    .insert({ id, email: String(email).trim().toLowerCase(), name: name || null, password_hash: passwordHash, active: true, is_admin: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
