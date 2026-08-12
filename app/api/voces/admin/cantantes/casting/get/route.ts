import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { getCantanteCasting } from "@/lib/voces-castings-cantantes";

// Ported from voces-bds's app/api/admin/cantantes/casting/get/route.ts.
export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const url = new URL(req.url);
    const id = String(url.searchParams.get("id") || "").trim();
    const shareId = String(url.searchParams.get("shareId") || "").trim();
    if (!id && !shareId) return NextResponse.json({ ok: false, error: "Missing id or shareId" }, { status: 400 });
    const casting = await getCantanteCasting(id ? { id } : { shareId });
    if (!casting) return NextResponse.json({ ok: false, error: "Casting not found" }, { status: 404 });
    return NextResponse.json({ ok: true, casting });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
