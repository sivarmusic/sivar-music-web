import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { listCastings, getApplications } from "@/lib/voces-castings";

// Ported from voces-bds's app/api/admin/casting/results/route.ts.
export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const castings = await listCastings();
    const results = await Promise.all(
      castings.map(async (c) => {
        const applications = await getApplications({ castingId: c.id });
        return { ...c, applications };
      })
    );
    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
