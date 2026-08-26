import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyPassword } from "@/lib/voces-auth";
import { signSession, buildSessionCookie, buildClearCookie } from "@/lib/voces-session";

// Signed-session migration (2026-08-26): único punto de login. Emite UN solo
// cookie, voces_session, firmado, con {cid, exp}. El rol NO va adentro — cada
// request lee is_admin de la fila (lib/voces-session.ts), así que revocar un
// admin tiene efecto inmediato. Ported from voces-bds's app/api/client/login/
// route.ts (post-hardening version, commit 068af42): `clients` -> `voces_clients`.
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
    const res = NextResponse.json({
      ok: true,
      client: { id: client.id, email: client.email, name: client.name, isAdmin },
    });

    const { token, maxAgeSeconds } = signSession(client.id, !!remember);
    res.headers.set("Set-Cookie", buildSessionCookie(token, maxAgeSeconds));

    // Se limpian las cookies del modelo viejo para que no queden dando
    // vueltas en los navegadores del equipo. Un voces_admin=1 olvidado en un
    // browser es exactamente la clase de cosa que reaparece.
    res.headers.append("Set-Cookie", buildClearCookie("voces_admin"));
    res.headers.append("Set-Cookie", buildClearCookie("voces_client"));

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, code: "SERVER", error: String(e?.message || e) }, { status: 500 });
  }
}
