import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { supabase } from "@/lib/supabase";

// Ported from voces-bds's app/api/admin/cantantes/route.ts:
// `cantantes`/`cantante_media` -> `voces_cantantes`/`voces_cantante_media`.
// Consumed by app/voces/cantantes/page.tsx (a prior batch's inline
// admin-toggle CRUD embedded in the public cantantes list, same as the
// original) — this was a gap flagged for this batch to close.
export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: cantantes, error } = await supabase
      .from("voces_cantantes")
      .select("id, full_name, email, phone, country, languages, styles, notes, visible, created_at")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const { data: media } = await supabase
      .from("voces_cantante_media")
      .select("cantante_id, kind, url, sort_order")
      .in("kind", ["voice_demo", "music_demo", "photo"])
      .order("sort_order", { ascending: true });

    const mediaByC = new Map<string, { demo?: string; foto?: string }>();
    for (const m of media ?? []) {
      const cur = mediaByC.get(m.cantante_id) || {};
      if ((m.kind === "voice_demo" || m.kind === "music_demo") && !cur.demo) cur.demo = m.url;
      if (m.kind === "photo" && !cur.foto) cur.foto = m.url;
      mediaByC.set(m.cantante_id, cur);
    }

    const result = (cantantes ?? []).map((c) => {
      const m = mediaByC.get(c.id) || {};
      return {
        id: c.id,
        nombre: c.full_name || "",
        email: c.email || "",
        phone: c.phone || "",
        pais: c.country || "",
        idioma: Array.isArray(c.languages) ? c.languages.join(", ") : "",
        estilo: Array.isArray(c.styles) ? c.styles.join(", ") : "",
        notas: c.notes || "",
        demo: m.demo || "",
        foto: m.foto || "/avatar-placeholder.svg",
        visible: c.visible ?? false,
        createdAt: c.created_at || null,
      };
    });

    return NextResponse.json({ ok: true, cantantes: result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Error" }, { status: 500 });
  }
}

function parseList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  if (typeof v !== "string") return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Sincroniza el demo del cantante en la tabla voces_cantante_media.
 * Reemplaza el demo existente (voice_demo/music_demo) por la URL provista.
 * Una URL vacía elimina el demo. Es idempotente.
 */
async function syncCantanteDemo(cantanteId: string, url: string | null) {
  await supabase
    .from("voces_cantante_media")
    .delete()
    .eq("cantante_id", cantanteId)
    .in("kind", ["voice_demo", "music_demo"]);

  if (url) {
    await supabase
      .from("voces_cantante_media")
      .insert({ cantante_id: cantanteId, kind: "voice_demo", url, sort_order: 0 });
  }
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const nombre = String(body.nombre ?? "").trim();
    if (!nombre) {
      return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
    }
    const email = String(body.email ?? "").trim() || null;
    const pais = String(body.pais ?? "").trim() || null;
    const gender = String(body.gender ?? "").trim() || null;
    const voiceType = String(body.voiceType ?? "").trim() || null;
    const notas = String(body.notas ?? "").trim() || null;
    const languages = parseList(body.idioma);
    const styles = parseList(body.estilo);

    const base: Record<string, any> = {
      full_name: nombre,
      email,
      country: pais,
      notes: notas,
      languages: languages.length ? languages : null,
      styles: styles.length ? styles : null,
      visible: true,
    };

    const { data, error } = await supabase
      .from("voces_cantantes")
      .insert({ ...base, gender, voice_type: voiceType })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    if (Object.prototype.hasOwnProperty.call(body, "demo") && data?.id) {
      const demoUrl = String(body.demo ?? "").trim() || null;
      await syncCantanteDemo(data.id, demoUrl);
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id, visible } = await req.json().catch(() => ({}));
    if (!id || typeof visible !== "boolean") {
      return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
    }
    const { error } = await supabase
      .from("voces_cantantes")
      .update({ visible })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: "Falta el id" }, { status: 400 });
    }
    const nombre = String(body.nombre ?? "").trim();
    if (!nombre) {
      return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
    }
    const languages = parseList(body.idioma);
    const styles = parseList(body.estilo);
    const patch: Record<string, any> = {
      full_name: nombre,
      email: String(body.email ?? "").trim() || null,
      country: String(body.pais ?? "").trim() || null,
      notes: String(body.notas ?? "").trim() || null,
      languages: languages.length ? languages : null,
      styles: styles.length ? styles : null,
    };
    const gender = String(body.gender ?? "").trim() || null;
    const voiceType = String(body.voiceType ?? "").trim() || null;

    const { error } = await supabase
      .from("voces_cantantes")
      .update({ ...patch, gender, voice_type: voiceType })
      .eq("id", id);

    if (error) throw new Error(error.message);

    if (Object.prototype.hasOwnProperty.call(body, "demo")) {
      const demoUrl = String(body.demo ?? "").trim() || null;
      await syncCantanteDemo(id, demoUrl);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id") || "";
    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = String(body?.id || "");
    }
    if (!id) {
      return NextResponse.json({ ok: false, error: "Falta el id" }, { status: 400 });
    }
    // voces_cantante_media tiene ON DELETE CASCADE — se borra solo.
    const { error } = await supabase
      .from("voces_cantantes")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Error" }, { status: 500 });
  }
}
