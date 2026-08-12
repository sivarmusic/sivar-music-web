import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Ported from voces-bds's app/api/registro/route.ts: `talents`/`talent_media`
// -> `voces_talents`/`voces_talent_media`.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      firstName, lastName, email, phone,
      gender, homeStudio, onlineSessions, equipment, socialMedia,
      country, age, voiceAges, languages, styles,
      isSinger, demoUrl, demo2Url, singerDemoUrl,
    } = body;

    if (!firstName || !lastName || !email || !phone || !gender || !country) {
      return NextResponse.json({ ok: false, error: "Faltan campos obligatorios" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Email inválido" }, { status: 400 });
    }

    const emailNorm = email.toLowerCase().trim();

    const { data: existing } = await supabase
      .from("voces_talents")
      .select("id")
      .eq("email", emailNorm)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: false, error: "Este email ya está registrado." }, { status: 409 });
    }

    const { data: talent, error: talentError } = await supabase
      .from("voces_talents")
      .insert({
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        email: emailNorm,
        phone: phone.trim() || null,
        country: country.trim() || null,
        gender: gender || null,
        languages: languages || [],
        styles: styles || [],
        ages: voiceAges || [],
        visible: false,
        home_studio: homeStudio === "yes",
        online_sessions: onlineSessions === "yes",
        social_url: socialMedia?.trim() || null,
        studio_equipment: equipment?.trim() || null,
        real_age: age ? parseInt(String(age), 10) : null,
        is_singer: isSinger === "yes",
      })
      .select("id")
      .single();

    if (talentError) throw new Error(talentError.message);

    const talentId = talent.id;
    const mediaItems: { talent_id: string; kind: string; url: string; sort_order: number }[] = [];
    if (demoUrl) mediaItems.push({ talent_id: talentId, kind: "voice_demo", url: demoUrl, sort_order: 1 });
    if (demo2Url) mediaItems.push({ talent_id: talentId, kind: "voice_demo_2", url: demo2Url, sort_order: 2 });
    if (singerDemoUrl && isSinger === "yes") mediaItems.push({ talent_id: talentId, kind: "singer_demo", url: singerDemoUrl, sort_order: 1 });

    if (mediaItems.length) {
      const { error: mediaError } = await supabase.from("voces_talent_media").insert(mediaItems);
      if (mediaError) throw new Error(mediaError.message);
    }

    return NextResponse.json({ ok: true, id: talentId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
