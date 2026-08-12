import { NextRequest, NextResponse } from "next/server";
import { getCantanteCasting } from "@/lib/voces-castings-cantantes";

// Ported from voces-bds's app/api/cantantes/casting/route.ts. Public (no
// auth): the share link for a cantante casting (/voces/cc/[id]) resolves the
// casting by its share_id through this route, exactly like the original.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    const casting = await getCantanteCasting({ shareId: id });
    if (!casting) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, casting });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
