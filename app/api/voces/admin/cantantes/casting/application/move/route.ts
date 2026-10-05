import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/voces-session";
import { getCantanteCasting, moveCantanteApplications } from "@/lib/voces-castings-cantantes";

const MAX_IDS = 200;

// Copia (keepOriginal=true, default) o muda postulaciones de cantantes a otro casting. Solo admin; todo se valida acá.
export async function POST(req: NextRequest) {
  if (!(await getAdmin(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const { ids, targetId, keepOriginal: keepRaw } = await req.json().catch(() => ({}));
    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > MAX_IDS ||
      !ids.every((i) => typeof i === "string" && i) ||
      typeof targetId !== "string" ||
      !targetId ||
      (keepRaw !== undefined && typeof keepRaw !== "boolean")
    ) {
      return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
    }

    const keepOriginal = keepRaw === undefined ? true : keepRaw;
    const target = await getCantanteCasting({ id: targetId });
    if (!target) return NextResponse.json({ ok: false, error: "El casting destino no existe" }, { status: 404 });

    const result = await moveCantanteApplications(ids, { id: target.id, shareId: target.shareId }, keepOriginal);
    if (result.moved.length === 0 && result.skipped.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Las postulaciones ya están en ese casting o no existen" },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      moved: result.moved.length,
      keepOriginal,
      skipped: result.skipped.map(({ name, reason }) => ({ name, reason })),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
