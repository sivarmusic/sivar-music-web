import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureAdmin } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/client/list/route.ts: clients ->
// voces_clients. Not explicitly named in this batch's route list, but
// app/voces/admin/clients/page.tsx (which IS in scope) calls this to list
// clients — the original admin/clients page never actually called an
// "admin/clients" route (no such route exists in voces-bds); it used
// /api/client/list instead. Ported here as /api/voces/client/list to keep
// the ported page functional, using the same admin-only gate as the
// original's local isAdmin() check.
export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: clients, error } = await supabase
    .from("voces_clients")
    .select("id, email, name, created_at, active, is_admin")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    clients: (clients ?? []).map((c) => ({
      id: c.id,
      email: c.email,
      name: c.name,
      createdAt: c.created_at,
      active: c.active,
      isAdmin: !!c.is_admin,
    })),
  });
}
