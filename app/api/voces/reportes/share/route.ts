import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { signShareToken } from "@/lib/voces-reportes/shareToken";

// Ported from voces-bds's app/api/reportes/share/route.ts.
//  - ensureAdmin: local cookie-substring check -> lib/voces-auth's shared
//    ensureAdmin() (voces_admin=1).
//  - Share URL: /reporte/[token] -> /voces/reporte/[token] (the public page
//    itself is batch 5's scope, not built here — this route only mints the
//    signed link ahead of it).
// Genera el link público (firmado) de un reporte. Solo admins pueden crearlo;
// después cualquiera con el link puede ver el reporte de ese rango.
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { desde?: string; hasta?: string; dias?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }

  try {
    const { token, expiresAt } = signShareToken(body.desde || "", body.hasta || "", body.dias ?? 7);
    const origin = req.headers.get("origin") || new URL(req.url).origin;
    return NextResponse.json({ ok: true, url: `${origin}/voces/reporte/${token}`, expiresAt });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "No se pudo generar el link" }, { status: 400 });
  }
}
