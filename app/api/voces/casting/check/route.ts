import { NextRequest, NextResponse } from "next/server";
import { applicationExists } from "@/lib/voces-castings";

// Ported from voces-bds's app/api/casting/check/route.ts. Public: lets the
// apply form warn the applicant before submit if that email already applied.
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const shareId = String(url.searchParams.get("shareId") || "").trim();
    const email = String(url.searchParams.get("email") || "").trim().toLowerCase();
    if (!shareId || !email) return NextResponse.json({ ok: false, error: "Missing params" }, { status: 400 });
    const exists = await applicationExists(shareId, email);
    return NextResponse.json({ ok: true, exists });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
