import { NextRequest, NextResponse } from "next/server";
import { getCasting } from "@/lib/voces-castings";

// Ported from voces-bds's app/api/casting/route.ts. Public (no auth): the
// share link for a locutor casting (/voces/c/[id]) resolves the casting by
// its share_id through this route, exactly like the original.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    const casting = await getCasting({ shareId: id });
    if (!casting) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, casting });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
