import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureAdmin } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/admin/locutores/route.ts:
//  - talents/talent_media/reel_update_requests -> voces_ prefixed tables.
//  - Dropped entirely: the legacy_hash_id / Google Sheets meta-store fallback
//    (readStore()/writeStore()'s `locutores` map, canUseLocutorMetaSheet(),
//    upsertLocutorMetaBatch()). voces_talents has no legacy_hash_id column —
//    every talent here already lives natively in Supabase, so PATCH is a
//    plain visibility update with no secondary sync step.
export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: talents, error } = await supabase
      .from("voces_talents")
      .select("id, full_name, email, phone, country, gender, languages, styles, ages, visible, created_at, code")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const { data: media } = await supabase
      .from("voces_talent_media")
      .select("talent_id, kind, url, sort_order")
      .in("kind", ["voice_demo", "photo"])
      .order("sort_order", { ascending: true });

    const mediaByTalent = new Map<string, { demo?: string; foto?: string }>();
    for (const m of media ?? []) {
      const cur = mediaByTalent.get(m.talent_id) || {};
      if (m.kind === "voice_demo" && !cur.demo) cur.demo = m.url;
      if (m.kind === "photo" && !cur.foto) cur.foto = m.url;
      mediaByTalent.set(m.talent_id, cur);
    }

    const { data: reelUpdates } = await supabase
      .from("voces_reel_update_requests")
      .select("talent_id, reviewed_at")
      .eq("status", "approved")
      .not("reviewed_at", "is", null)
      .order("reviewed_at", { ascending: false });

    const lastUpdateByTalent = new Map<string, string>();
    for (const r of reelUpdates ?? []) {
      if (!lastUpdateByTalent.has(r.talent_id) && r.reviewed_at) {
        lastUpdateByTalent.set(r.talent_id, r.reviewed_at);
      }
    }

    const result = (talents ?? []).map((t) => {
      const m = mediaByTalent.get(t.id) || {};
      return {
        id: t.id,
        nombre: t.full_name || "",
        email: t.email || "",
        phone: t.phone || "",
        idioma: (t.languages || []).join(", "),
        genero: t.gender || "",
        estilo: (t.styles || []).join(", "),
        edad: (t.ages || []).join(", "),
        demo: m.demo || "",
        foto: m.foto || "/avatar-placeholder.svg",
        visible: t.visible ?? true,
        createdAt: t.created_at || null,
        updatedAt: lastUpdateByTalent.get(t.id) || null,
        code: t.code || undefined,
        pais: t.country || undefined,
      };
    });

    return NextResponse.json({ ok: true, locutores: result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Error desconocido" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, visible } = await req.json().catch(() => ({}));
    if (!id || typeof id !== "string" || typeof visible !== "boolean") {
      return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
    }

    const { error } = await supabase.from("voces_talents").update({ visible }).eq("id", id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Error desconocido" }, { status: 500 });
  }
}
