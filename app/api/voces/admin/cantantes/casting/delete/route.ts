import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { deleteCantanteCasting } from "@/lib/voces-castings-cantantes";
import { snapshotCastingToTrash } from "@/lib/voces-casting-trash";

// Ported from voces-bds's app/api/admin/cantantes/casting/delete/route.ts,
// with the same voces_trash snapshot addition as the locutor casting delete
// route (see app/api/voces/admin/casting/delete/route.ts's comment).
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await req.json().catch(() => ({}));
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    await snapshotCastingToTrash({
      castingsTable: "voces_castings_cantantes",
      applicationsTable: "voces_casting_cantante_applications",
      castingId: id,
    });

    await deleteCantanteCasting(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Error" }, { status: 500 });
  }
}
