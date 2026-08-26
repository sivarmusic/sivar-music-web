import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/voces-session";
import { listCantantesCastings, getCantanteApplications } from "@/lib/voces-castings-cantantes";

// Ported from voces-bds's app/api/admin/cantantes/casting/results/route.ts.
export async function GET(req: NextRequest) {
  if (!(await getAdmin(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const castings = await listCantantesCastings();
    const results = await Promise.all(
      castings.map(async (c) => {
        const applications = await getCantanteApplications({ castingId: c.id });
        return { ...c, applications };
      })
    );
    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
