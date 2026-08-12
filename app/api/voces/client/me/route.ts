import { NextRequest, NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/client/me/route.ts, rewritten on top of
// this repo's shared getCurrentClient() helper (lib/voces-auth.ts) instead of
// duplicating the cookie + Supabase lookup here.
export async function GET(req: NextRequest) {
  const client = await getCurrentClient(req);
  return NextResponse.json({ ok: true, client });
}
