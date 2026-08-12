import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { setApplicationSelected } from "@/lib/voces-castings";

// Ported from voces-bds's app/api/admin/casting/application/select/route.ts.
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  try {
    const { applicationId, castingId, selected } = await req.json();
    if (!applicationId || !castingId || typeof selected !== "boolean") {
      return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });
    }

    await setApplicationSelected(applicationId, castingId, selected);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
