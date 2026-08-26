import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/voces-session";
import { listCantantesCastings } from "@/lib/voces-castings-cantantes";

// Ported from voces-bds's app/api/admin/cantantes/casting/list/route.ts.
// One of the four endpoints app/voces/components/proyecto/MoverACastingModal.tsx
// depends on — must match its `cantante.list` path exactly.
export async function GET(req: NextRequest) {
  if (!(await getAdmin(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const castings = await listCantantesCastings();
    return NextResponse.json({ ok: true, castings });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
