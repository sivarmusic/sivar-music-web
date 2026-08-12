import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { getCantanteCasting, getCantanteApplications } from "@/lib/voces-castings-cantantes";

// Ported from voces-bds's app/api/admin/cantantes/casting/results/[id]/route.ts.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const { id: shareId } = await params;
    const casting = await getCantanteCasting({ shareId });
    if (!casting) return NextResponse.json({ ok: false, error: "Casting no encontrado" }, { status: 404 });
    const applications = await getCantanteApplications({ shareId });
    return NextResponse.json({ ok: true, casting, applications });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
