import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { setCantanteApplicationSelected } from "@/lib/voces-castings-cantantes";

// Ported from voces-bds's app/api/admin/cantantes/casting/application/select/route.ts.
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const { applicationId, selected } = await req.json().catch(() => ({}));
    if (!applicationId || typeof selected !== "boolean") {
      return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
    }
    await setCantanteApplicationSelected(applicationId, selected);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
