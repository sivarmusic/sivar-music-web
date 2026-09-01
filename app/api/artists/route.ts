import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/lib/pinkfest-auth";

const SELECT_COLUMNS =
  "id, slug, name, genre, summary, profile_paragraphs, profile_highlights, visible, sort_order";

export async function GET() {
  const user = await verifyAdminSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("artists")
    .select(SELECT_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ artists: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const user = await verifyAdminSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: {
    id?: unknown;
    name?: unknown;
    genre?: unknown;
    summary?: unknown;
    profile_paragraphs?: unknown;
    profile_highlights?: unknown;
    visible?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (typeof body.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ error: "Falta el id del artista" }, { status: 400 });
  }

  // slug/sort_order no se pueden tocar desde acá: son parte del keyeado con
  // artistAssets en código y del orden fijo del seed.
  const update: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    if (body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre no puede estar vacío" },
        { status: 400 }
      );
    }
    update.name = body.name;
  }

  if (typeof body.genre === "string") {
    if (body.genre.trim().length === 0) {
      return NextResponse.json(
        { error: "El género no puede estar vacío" },
        { status: 400 }
      );
    }
    update.genre = body.genre;
  }

  if (typeof body.summary === "string") {
    update.summary = body.summary;
  }

  if (Array.isArray(body.profile_paragraphs)) {
    if (!body.profile_paragraphs.every((item) => typeof item === "string")) {
      return NextResponse.json(
        { error: "Los párrafos del perfil deben ser texto" },
        { status: 400 }
      );
    }
    update.profile_paragraphs = body.profile_paragraphs;
  }

  if (Array.isArray(body.profile_highlights)) {
    if (!body.profile_highlights.every((item) => typeof item === "string")) {
      return NextResponse.json(
        { error: "Las claves del perfil deben ser texto" },
        { status: 400 }
      );
    }
    update.profile_highlights = body.profile_highlights;
  }

  if (typeof body.visible === "boolean") {
    update.visible = body.visible;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("artists")
    .update(update)
    .eq("id", body.id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ artist: data });
}
