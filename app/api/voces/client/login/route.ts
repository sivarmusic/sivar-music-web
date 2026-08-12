import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { VOCES_CLIENT_COOKIE, VOCES_ADMIN_COOKIE, verifyPassword } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/client/login/route.ts: `clients` -> `voces_clients`,
// bcrypt.compare inlined there -> the shared verifyPassword() helper (lib/voces-auth.ts),
// bds_client/bds_admin cookies -> voces_client/voces_admin.
export async function POST(req: NextRequest) {
  try {
    const { email, password, remember } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ ok: false, code: "MISSING", error: "Faltan email o contraseña." }, { status: 400 });
    }

    const { data: client, error } = await supabase
      .from("voces_clients")
      .select("id, email, name, password_hash, active, is_admin")
      .ilike("email", String(email).trim())
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!client || client.active === false) {
      return NextResponse.json({ ok: false, code: "EMAIL_NOT_FOUND", error: "Este email no está registrado." }, { status: 401 });
    }

    const ok = await verifyPassword(String(password), client.password_hash);
    if (!ok) {
      return NextResponse.json({ ok: false, code: "WRONG_PASSWORD", error: "Contraseña incorrecta." }, { status: 401 });
    }

    const isAdmin = !!client.is_admin;
    const res = NextResponse.json({ ok: true, client: { id: client.id, email: client.email, name: client.name, isAdmin } });
    const secure = process.env.NODE_ENV === "production";
    const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24;

    res.headers.set("Set-Cookie", `${VOCES_CLIENT_COOKIE}=${client.id}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax; ${secure ? "Secure;" : ""}`);
    if (isAdmin) {
      res.headers.append("Set-Cookie", `${VOCES_ADMIN_COOKIE}=1; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax; ${secure ? "Secure;" : ""}`);
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, code: "SERVER", error: String(e?.message || e) }, { status: 500 });
  }
}
