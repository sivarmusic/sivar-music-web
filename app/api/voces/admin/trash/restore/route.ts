import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureAdmin } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/admin/trash/restore/route.ts:
// store.castings / store.castingApplications (arrays in store.json) ->
// voces_castings / voces_casting_applications tables. Each trash row's
// `casting`/`application` JSONB snapshot is expected to already match those
// tables' column shape (i.e. whatever a future delete-to-trash flow reads
// with `.select("*")` before removing the row) — restoring is just an
// upsert of that snapshot back in, keyed on id to avoid duplicates.
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const ct = req.headers.get("content-type") || "";
  let id = "";
  if (ct.includes("application/json")) {
    const body = await req.json().catch(() => ({} as any));
    id = String((body as any).id || "").trim();
  } else {
    const fd = await req.formData();
    id = String(fd.get("id") || "").trim();
  }
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const { data: item, error: fetchError } = await supabase
    .from("voces_trash")
    .select("id, type, casting, applications, application")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  if (!item) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (item.type === "casting") {
    if (item.casting) {
      const { error } = await supabase.from("voces_castings").upsert(item.casting, { onConflict: "id" });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    const applications = Array.isArray(item.applications) ? item.applications : [];
    if (applications.length) {
      const { error } = await supabase.from("voces_casting_applications").upsert(applications, { onConflict: "id" });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  } else if (item.type === "application") {
    if (item.application) {
      const { error } = await supabase.from("voces_casting_applications").upsert(item.application, { onConflict: "id" });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  }

  const { error: deleteError } = await supabase.from("voces_trash").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
