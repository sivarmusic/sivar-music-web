import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/lib/pinkfest-auth";

const SELECT_COLUMNS =
  "id, slug, title, description, partner_credit, visible, sort_order";

export async function GET() {
  const user = await verifyAdminSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("sound_for_films_videos")
    .select(SELECT_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ videos: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const user = await verifyAdminSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: {
    id?: unknown;
    title?: unknown;
    description?: unknown;
    partner_credit?: unknown;
    visible?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (typeof body.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ error: "Falta el id del video" }, { status: 400 });
  }

  // filename/slug/sort_order no se pueden tocar desde acá: son parte del
  // storage layout y del orden fijo del seed.
  const update: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    if (body.title.trim().length === 0) {
      return NextResponse.json(
        { error: "El título no puede estar vacío" },
        { status: 400 }
      );
    }
    update.title = body.title;
  }

  if (typeof body.description === "string") {
    update.description = body.description;
  }

  if (typeof body.partner_credit === "string") {
    update.partner_credit = body.partner_credit;
  }

  if (typeof body.visible === "boolean") {
    update.visible = body.visible;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sound_for_films_videos")
    .update(update)
    .eq("id", body.id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ video: data });
}
