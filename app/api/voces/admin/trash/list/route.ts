import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureAdmin } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/admin/trash/list/route.ts:
// readStore().trash -> voces_trash table (see scripts/voces-schema.sql).
export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("voces_trash")
    .select("id, type, casting, applications, application, files, deleted_at")
    .order("deleted_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const trash = (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    casting: row.casting ?? undefined,
    applications: row.applications ?? undefined,
    application: row.application ?? undefined,
    files: row.files ?? undefined,
    deletedAt: row.deleted_at,
  }));

  return NextResponse.json({ ok: true, trash });
}
