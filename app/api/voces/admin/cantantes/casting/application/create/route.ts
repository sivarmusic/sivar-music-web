import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { getCantanteCasting, createCantanteApplication, cantanteApplicationExists } from "@/lib/voces-castings-cantantes";

// Ported from voces-bds's app/api/admin/cantantes/casting/application/create/route.ts.
// One of the four endpoints app/voces/components/proyecto/MoverACastingModal.tsx
// depends on — must match its `cantante.create` path exactly.
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  try {
    const body = await req.json();
    const shareId = String(body.shareId || "").trim();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();
    const country = String(body.country || "").trim();
    const genderRaw = String(body.gender || "").trim().toLowerCase();
    const gender = genderRaw === "female" || genderRaw === "femenino" || genderRaw === "f"
      ? "Female"
      : genderRaw === "male" || genderRaw === "masculino" || genderRaw === "m"
      ? "Male"
      : "";
    const homeStudioRaw = String(body.homeStudio || "").toLowerCase();
    const onlineSessionsRaw = String(body.onlineSessions || "").toLowerCase();
    const audioUrl = body.audioUrl ? String(body.audioUrl).trim() : null;

    if (!shareId || !firstName || !lastName) {
      return NextResponse.json({ ok: false, error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const casting = await getCantanteCasting({ shareId });
    if (!casting) return NextResponse.json({ ok: false, error: "Casting no encontrado" }, { status: 404 });

    if (email) {
      const dup = await cantanteApplicationExists(shareId, email);
      if (dup) return NextResponse.json({ ok: false, error: "Ya existe una postulación con ese email" }, { status: 409 });
    }

    const homeStudio = ["si", "sí", "yes", "true"].includes(homeStudioRaw);
    const onlineSessions = ["si", "sí", "yes", "true"].includes(onlineSessionsRaw);

    const app = await createCantanteApplication({
      castingId: casting.id,
      shareId: casting.shareId,
      firstName,
      lastName,
      phone,
      email,
      country,
      gender,
      homeStudio,
      onlineSessions,
      audioUrl,
    });

    return NextResponse.json({ ok: true, application: app });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
