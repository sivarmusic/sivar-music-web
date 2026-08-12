import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { getCasting, deleteCasting } from "@/lib/voces-castings";
import { snapshotCastingToTrash } from "@/lib/voces-casting-trash";

// Ported from voces-bds's app/api/admin/casting/delete/route.ts, with one
// addition per the batch 4b brief: snapshot the casting + its applications
// into voces_trash before deleting, so the trash/restore feature (batch 4a)
// has data to act on — the original never actually wrote to its trash table
// for casting deletes (see scripts/voces-schema.sql's comment on voces_trash).
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const ct = req.headers.get("content-type") || "";
    let id = "";
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({} as any));
      id = String(body.id || "").trim();
    } else {
      const fd = await req.formData();
      id = String(fd.get("id") || "").trim();
    }
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const casting = await getCasting({ id });
    if (!casting) return NextResponse.json({ ok: false, error: "Casting not found" }, { status: 404 });

    await snapshotCastingToTrash({
      castingsTable: "voces_castings",
      applicationsTable: "voces_casting_applications",
      castingId: id,
    });

    // deleteCasting borra en cascada las aplicaciones (ON DELETE CASCADE en Supabase)
    await deleteCasting(id);
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
