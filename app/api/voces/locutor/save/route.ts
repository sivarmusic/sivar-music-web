import { NextResponse } from "next/server";

// Ported from voces-bds's app/api/locutor/save/route.ts — this endpoint was
// already disabled upstream ("Endpoint deshabilitado: Supabase fue removido
// del proyecto"), superseded by the actualizar-reel self-service flow
// (see app/api/voces/actualizar-reel). Kept as a matching disabled stub so
// the admin edit form on the locutor profile page (a legacy, already-broken
// feature upstream) doesn't silently 404 with a different error shape.
export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Endpoint deshabilitado. Usá /voces/actualizar-reel para actualizar demos." },
    { status: 501 }
  );
}
