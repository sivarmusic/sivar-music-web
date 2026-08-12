import { NextResponse } from "next/server";

// Ported verbatim from voces-bds's app/api/admin/email-prefs/route.ts — it
// was already deprecated in the original (superseded by
// /api/user/notification-prefs, ported earlier as
// /api/voces/user/notification-prefs). Kept as a 410 stub for parity.
export async function GET() {
  return NextResponse.json({ ok: false, error: "Deprecated" }, { status: 410 });
}
export async function PUT() {
  return NextResponse.json({ ok: false, error: "Deprecated" }, { status: 410 });
}
