import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { ensureAdmin, hashPassword } from "@/lib/voces-auth";
import { notifyNewClient } from "@/lib/voces-email";

// Ported from voces-bds's app/api/client/register/route.ts: clients ->
// voces_clients, bcrypt.hash inlined there -> hashPassword() (lib/voces-auth.ts),
// notifyNewClient -> lib/voces-email.ts's version. Dropped lib/store.ts's
// uid("cli") in favor of a plain randomUUID with the same "cli_" prefix.
// Admin-only (creates a client on someone else's behalf) — flagged as
// skipped by an earlier batch, ported here.
export async function POST(req: NextRequest) {
  try {
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
    if (existing) return NextResponse.json({ ok: false, error: "Client already exists" }, { status: 409 });

    const passwordHash = await hashPassword(String(password));
    const id = `cli_${randomUUID()}`;

    const { data: client, error } = await supabase
      .from("voces_clients")
      .insert({ id, email: String(email).trim().toLowerCase(), name: name || null, password_hash: passwordHash, active: true, is_admin: false })
      .select("id, email, name")
      .single();

    if (error) throw new Error(error.message);
    notifyNewClient({ nombre: client.name ?? "", email: client.email }).catch(() => {});
    return NextResponse.json({ ok: true, client: { id: client.id, email: client.email, name: client.name } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
