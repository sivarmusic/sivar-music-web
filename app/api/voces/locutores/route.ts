import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getClientIdFromRequest, ensureAdmin } from "@/lib/voces-auth";

// Ported from voces-bds's app/api/locutores/route.ts: `talents`/`talent_media`
// -> `voces_talents`/`voces_talent_media`, and the raw bds_client/bds_admin
// cookie sniffing -> the shared voces-auth.ts helpers.
export async function GET(req: NextRequest) {
  try {
    const isLoggedIn = !!getClientIdFromRequest(req) || ensureAdmin(req);

    const { data, error } = await supabase
      .from("voces_talents")
      .select(`
        id,
        full_name,
        email,
        phone,
        country,
        gender,
        languages,
        styles,
        ages,
        code,
        visible,
        voces_talent_media (
          kind,
          url,
          sort_order
        )
      `)
      .eq("visible", true)
      .order("full_name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const locutores = (data ?? []).map((t: any) => {
      const media = t.voces_talent_media ?? [];
      const demos = media
        .filter((m: any) => m.kind.startsWith("voice_demo"))
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((m: any) => m.url);

      const photo = media.find((m: any) => m.kind === "photo")?.url;

      return {
        id: t.id,
        nombre: t.full_name,
        email: isLoggedIn ? t.email : undefined,
        phone: isLoggedIn ? t.phone : undefined,
        pais: t.country,
        genero: t.gender,
        idioma: t.languages,
        estilo: t.styles,
        edad: t.ages,
        code: t.code,
        demo: demos[0],
        demo2: demos[1],
        demo3: demos[2],
        foto_url: photo,
      };
    });

    return NextResponse.json({
      ok: true,
      count: locutores.length,
      locutores,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error desconocido" },
      { status: 500 }
    );
  }
}
