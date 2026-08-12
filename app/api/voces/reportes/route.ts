import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { buildReport } from "@/lib/voces-reportes/aggregate";
import { verifyShareToken } from "@/lib/voces-reportes/shareToken";
import { redactForShare } from "@/lib/voces-reportes/redact";

// Ported from voces-bds's app/api/reportes/route.ts.
//  - ensureAdmin: local cookie-substring check -> lib/voces-auth's shared
//    ensureAdmin() (voces_admin=1), same as every other app/api/voces/admin/*
//    route in this repo.
//  - Deliberately NOT nested under app/api/voces/admin/* even though it
//    requires admin for the cookie path: this route also serves the public
//    share-token path (no cookie at all) for the future public
//    app/voces/reporte/[token] page (batch 5), exactly like the original's
//    top-level (non-/admin/) placement.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Valida y sanitiza un parámetro de fecha (YYYY-MM-DD). Devuelve null si es inválido.
function parseDateParam(v: string | null): string | null {
  if (!v || !DATE_RE.test(v)) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return v;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // Dos vías de acceso: cookie de admin, o token firmado de link compartido.
  // Con token, el rango sale del propio token — nunca de la query — para que
  // nadie pueda ampliar el período que se compartió.
  const shared = verifyShareToken(url.searchParams.get("token"));

  if (!shared && !ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const desde = shared ? shared.d : parseDateParam(url.searchParams.get("desde"));
  const hasta = shared ? shared.h : parseDateParam(url.searchParams.get("hasta"));

  if (!desde || !hasta) {
    return NextResponse.json({ ok: false, error: "Rango de fechas inválido (usar YYYY-MM-DD)" }, { status: 400 });
  }
  if (desde > hasta) {
    return NextResponse.json({ ok: false, error: "La fecha 'desde' es posterior a 'hasta'" }, { status: 400 });
  }

  try {
    const data = await buildReport(`${desde}T00:00:00.000Z`, `${hasta}T23:59:59.999Z`);
    // Por link compartido salen los emails enmascarados (incluido `raw`, que
    // alimenta el Excel). Por cookie de admin, el dato completo.
    return NextResponse.json({ ok: true, data: shared ? redactForShare(data) : data, compartido: !!shared });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error generando reporte" }, { status: 500 });
  }
}
