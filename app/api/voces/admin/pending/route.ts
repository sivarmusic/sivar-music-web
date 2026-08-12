import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureAdmin } from "@/lib/voces-auth";
import { makeLocutorSlug } from "@/lib/voces-slug";

// Ported from voces-bds's app/api/admin/pending/route.ts: talents -> voces_talents.
export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { data, error } = await supabase
      .from("voces_talents")
      .select("id, full_name, created_at, code")
      .eq("visible", false)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const pending = (data ?? []).map((row) => {
      const idPart = row.code ? String(row.code) : row.id;
      const slug = makeLocutorSlug(row.full_name ?? "", idPart);
      return { id: row.id, nombre: row.full_name, createdAt: row.created_at, slug };
    });

    return NextResponse.json({ ok: true, count: pending.length, pending });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Error" }, { status: 500 });
  }
}
