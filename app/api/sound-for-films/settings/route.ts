import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/lib/pinkfest-auth";
import {
  hashGatePassword,
  invalidateGateSettingsCache,
} from "@/lib/sound-for-films-gate";

export async function GET() {
  const user = await verifyAdminSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data } = await supabase
    .from("sound_for_films_settings")
    .select("gate_enabled, password_hash, updated_at")
    .eq("id", 1)
    .maybeSingle();

  return NextResponse.json({
    gate_enabled: data?.gate_enabled !== false,
    has_password: Boolean(data?.password_hash),
    updated_at: data?.updated_at ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await verifyAdminSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { gate_enabled?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const update: Record<string, unknown> = { id: 1 };

  if (typeof body.gate_enabled === "boolean") {
    update.gate_enabled = body.gate_enabled;
  }

  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }
    update.password_hash = await hashGatePassword(body.password);
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sound_for_films_settings")
    .upsert(update)
    .select("gate_enabled, password_hash, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateGateSettingsCache();

  return NextResponse.json({
    gate_enabled: data.gate_enabled !== false,
    has_password: Boolean(data.password_hash),
    updated_at: data.updated_at,
  });
}
