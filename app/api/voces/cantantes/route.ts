import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getClientIdFromRequest, ensureAdmin } from "@/lib/voces-auth";
import { effectiveVoiceType } from "@/lib/voces-voice";

// Ported from voces-bds's app/api/cantantes/route.ts: `cantantes`/`cantante_media`
// -> `voces_cantantes`/`voces_cantante_media`.
export async function GET(req: NextRequest) {
  try {
    const isLoggedIn = !!getClientIdFromRequest(req) || ensureAdmin(req);

    const { data, error } = await supabase
      .from("voces_cantantes")
      .select(`
        id,
        full_name,
        email,
        phone,
        country,
        languages,
        styles,
        notes,
        gender,
        voice_type,
        visible,
        voces_cantante_media (
          kind,
          url,
          sort_order
        )
      `)
      .eq("visible", true)
      .order("full_name", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const cantantes = (data ?? []).map((c: any) => {
      const media = c.voces_cantante_media ?? [];
      const demos = media
        .filter((m: any) => m.kind.startsWith("voice_demo") || m.kind.startsWith("music_demo"))
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((m: any) => m.url);
      const photo = media.find((m: any) => m.kind === "photo")?.url;

      return {
        id: c.id,
        nombre: c.full_name,
        email: isLoggedIn ? c.email : undefined,
        phone: isLoggedIn ? c.phone : undefined,
        pais: c.country,
        genero: c.gender ?? null,
        tipoVoz: effectiveVoiceType(c.voice_type, c.notes),
        idioma: c.languages,   // TEXT[] — array directo
        estilo: c.styles,      // TEXT[] — array directo
        notas: c.notes ?? null,
        demo: demos[0],
        foto_url: photo,
      };
    });

    return NextResponse.json({ ok: true, count: cantantes.length, cantantes });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Error desconocido" }, { status: 500 });
  }
}
