import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { hashPassword, verifyPassword } from "@/lib/voces-auth";
import { getSession } from "@/lib/voces-session";
import { validateNewPassword } from "@/lib/voces-password";

// Cambio de contraseña propia. NO es recuperación: exige estar logueado y
// saber la contraseña actual. El flujo de "olvidé mi contraseña" (token +
// mail) es otra cosa y todavía no existe.
//
// Existe para que quien fija las contraseñas iniciales deje de ser el único
// que las conoce: si el admin setea la de todos y nadie puede cambiarla,
// nunca se puede probar quién hizo qué, porque cualquiera pudo entrar como
// cualquiera.
//
// NO usa getAdmin: cualquier usuario válido puede cambiar la suya. Y no
// recibe un id — opera SIEMPRE sobre la fila de la sesión, así que no sirve
// para tocarle la contraseña a otro.
//
// Ported from voces-bds's app/api/client/change-password/route.ts.
export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json().catch(() => ({}));
  const current = String(currentPassword ?? "");
  const next = String(newPassword ?? "");

  const check = validateNewPassword(current, next);
  if (!check.ok) {
    return NextResponse.json({ ok: false, error: check.error }, { status: 400 });
  }

  const { data: row, error: readErr } = await supabase
    .from("voces_clients")
    .select("password_hash")
    .eq("id", session.clientId)
    .maybeSingle();

  if (readErr || !row?.password_hash) {
    return NextResponse.json({ ok: false, error: "No se pudo verificar la contraseña actual" }, { status: 500 });
  }

  const matches = await verifyPassword(current, row.password_hash);
  if (!matches) {
    // Mensaje genérico a propósito: no confirma ni desmiente nada sobre la
    // cuenta más allá de lo que el usuario ya sabe (está logueado en ella).
    return NextResponse.json({ ok: false, error: "La contraseña actual no es correcta" }, { status: 400 });
  }

  const passwordHash = await hashPassword(next);
  const { error: writeErr } = await supabase
    .from("voces_clients")
    .update({ password_hash: passwordHash })
    .eq("id", session.clientId);

  if (writeErr) {
    return NextResponse.json({ ok: false, error: "No se pudo guardar la contraseña" }, { status: 500 });
  }

  // LÍMITE CONOCIDO: cambiar la contraseña NO cierra las sesiones abiertas en
  // otros dispositivos. El token firmado solo lleva {cid, exp} y no depende
  // del hash, así que sigue siendo válido hasta que expire. Para invalidarlas
  // haría falta versionar la sesión (columna en voces_clients incluida en el
  // payload) — no está en el alcance de este pase.
  return NextResponse.json({ ok: true });
}
