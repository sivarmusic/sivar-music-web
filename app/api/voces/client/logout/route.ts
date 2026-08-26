import { NextResponse } from "next/server";
import { buildClearCookie } from "@/lib/voces-session";

// Signed-session migration: limpia las tres cookies (la nueva + las dos del
// modelo viejo) para que el logout funcione sin importar con cuál haya
// entrado la persona.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildClearCookie("voces_session"));
  res.headers.append("Set-Cookie", buildClearCookie("voces_client"));
  res.headers.append("Set-Cookie", buildClearCookie("voces_admin"));
  return res;
}
