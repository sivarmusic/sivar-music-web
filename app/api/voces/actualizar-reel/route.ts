import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { queueVocesEvent } from "@/lib/voces-notifications";

// Ported from voces-bds's app/api/actualizar-reel/route.ts: `talents` ->
// `voces_talents`, `talent_media` -> `voces_talent_media`,
// `reel_update_requests` -> `voces_reel_update_requests`, and
// lib/email.ts's queueEvent -> lib/voces-notifications.ts's queueVocesEvent.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const emailRaw = (searchParams.get("email") || "").toLowerCase().trim();
    if (!emailRaw) {
      return NextResponse.json({ ok: false, error: "Email requerido" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return NextResponse.json({ ok: false, error: "Email inválido" }, { status: 400 });
    }

    const { data: talent, error } = await supabase
      .from("voces_talents")
      .select("id, full_name, email")
      .eq("email", emailRaw)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!talent) {
      return NextResponse.json({ ok: false, error: "No encontramos un locutor con ese email." }, { status: 404 });
    }

    const { data: media } = await supabase
      .from("voces_talent_media")
      .select("id, kind, url, sort_order")
      .eq("talent_id", talent.id)
      .in("kind", ["voice_demo", "voice_demo_2"])
      .order("sort_order", { ascending: true });

    const demos = (media ?? []).map((m) => ({
      id: m.id,
      kind: m.kind,
      url: m.url,
      label: m.kind === "voice_demo" ? "Demo principal" : "Demo adicional",
    }));

    const { data: pending } = await supabase
      .from("voces_reel_update_requests")
      .select("id")
      .eq("talent_id", talent.id)
      .eq("status", "pending")
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      talent: {
        id: talent.id,
        fullName: talent.full_name,
        email: talent.email,
      },
      demos,
      hasPending: !!pending,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, mode, targetMediaId, newAudioUrl, newAudioFilename, newPhone } = body;

    if (!email || !mode || !newAudioUrl) {
      return NextResponse.json({ ok: false, error: "Faltan campos obligatorios" }, { status: 400 });
    }
    if (mode !== "replace" && mode !== "add") {
      return NextResponse.json({ ok: false, error: "Modo inválido" }, { status: 400 });
    }

    const emailNorm = String(email).toLowerCase().trim();

    const { data: talent } = await supabase
      .from("voces_talents")
      .select("id, email, full_name")
      .eq("email", emailNorm)
      .maybeSingle();

    if (!talent) {
      return NextResponse.json({ ok: false, error: "Locutor no encontrado" }, { status: 404 });
    }

    let targetKind: string | null = null;
    let targetId: string | null = null;

    if (mode === "replace") {
      if (!targetMediaId) {
        return NextResponse.json({ ok: false, error: "Falta el demo a reemplazar" }, { status: 400 });
      }
      const { data: targetMedia } = await supabase
        .from("voces_talent_media")
        .select("id, kind, talent_id")
        .eq("id", targetMediaId)
        .maybeSingle();

      if (!targetMedia || targetMedia.talent_id !== talent.id) {
        return NextResponse.json({ ok: false, error: "Demo no válido" }, { status: 400 });
      }
      targetKind = targetMedia.kind;
      targetId = targetMedia.id;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("voces_reel_update_requests")
      .insert({
        talent_id: talent.id,
        email: emailNorm,
        mode,
        target_kind: targetKind,
        target_media_id: targetId,
        new_audio_url: newAudioUrl,
        new_audio_filename: newAudioFilename || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) throw new Error(insertError.message);

    queueVocesEvent("reel_request", { nombre: talent.full_name ?? emailNorm, email: emailNorm }).catch(() => {});

    if (typeof newPhone === "string" && newPhone.trim().length > 0) {
      const phoneClean = newPhone.trim().slice(0, 40);
      await supabase
        .from("voces_talents")
        .update({ phone: phoneClean })
        .eq("id", talent.id);
    }

    return NextResponse.json({ ok: true, id: inserted.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
