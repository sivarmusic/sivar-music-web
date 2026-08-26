import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/voces-session";
import { listCastings } from "@/lib/voces-castings";

// Ported from voces-bds's app/api/admin/casting/list/route.ts.
export async function GET(req: NextRequest) {
  if (!(await getAdmin(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const castings = await listCastings();
    return NextResponse.json({ ok: true, castings });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
