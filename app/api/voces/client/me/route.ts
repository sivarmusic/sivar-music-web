import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/voces-session";

// Signed-session migration: getCurrentClient() (lib/voces-auth.ts, cookie sin
// firmar) -> getSession() (lib/voces-session.ts, verifica firma + relee la
// fila). El shape de la respuesta ({id, email, name, isAdmin}) se mantiene
// igual a propósito, para no tener que tocar cada consumidor de este endpoint.
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const client = session ? { id: session.clientId, email: session.email, name: session.name, isAdmin: session.isAdmin } : null;
  return NextResponse.json({ ok: true, client });
}
