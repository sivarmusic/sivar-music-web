import { NextResponse } from "next/server";
import { VOCES_CLIENT_COOKIE, VOCES_ADMIN_COOKIE } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/client/logout/route.ts, clearing both
// voces_client and voces_admin (the original only cleared bds_client, but
// this repo's login route sets both, so both must be cleared on logout).
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", `${VOCES_CLIENT_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
  res.headers.append("Set-Cookie", `${VOCES_ADMIN_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
  return res;
}
