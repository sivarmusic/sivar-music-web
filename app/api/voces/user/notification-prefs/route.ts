import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getClientIdFromRequest } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/user/notification-prefs/route.ts:
// `user_notification_prefs` -> `voces_user_notification_prefs`.
const VALID_FREQ = new Set(["off", "daily", "weekly", "monthly"]);

const DEFAULTS = {
  casting_cantante: false,
  casting_locutor: false,
  new_client: false,
  reel_request_freq: "off",
  new_locutor_freq: "off",
};

export async function GET(req: NextRequest) {
  const clientId = getClientIdFromRequest(req);
  if (!clientId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { data } = await supabase
    .from("voces_user_notification_prefs")
    .select("casting_cantante, casting_locutor, new_client, reel_request_freq, new_locutor_freq")
    .eq("client_id", clientId)
    .maybeSingle();
  return NextResponse.json({ ok: true, prefs: data ? { ...DEFAULTS, ...data } : DEFAULTS });
}

export async function PUT(req: NextRequest) {
  const clientId = getClientIdFromRequest(req);
  if (!clientId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const body = await req.json();
  const prefs = {
    client_id: clientId,
    casting_cantante: !!body.casting_cantante,
    casting_locutor: !!body.casting_locutor,
    new_client: !!body.new_client,
    reel_request_freq: VALID_FREQ.has(body.reel_request_freq) ? body.reel_request_freq : "off",
    new_locutor_freq: VALID_FREQ.has(body.new_locutor_freq) ? body.new_locutor_freq : "off",
  };
  const { error } = await supabase
    .from("voces_user_notification_prefs")
    .upsert(prefs, { onConflict: "client_id" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
