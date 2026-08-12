import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import {
  getCantanteCasting,
  createCantanteApplication,
  cantanteApplicationExists,
  uploadCantanteCastingFile,
} from "@/lib/voces-castings-cantantes";
import { toArray } from "@/lib/voces-arrays";
import { notifyCastingCantante } from "@/lib/voces-email";

// Ported from voces-bds's app/api/cantantes/casting/apply/route.ts. Public
// (no auth required to submit); the admin-bypass checks relax validation for
// the same cookie ensureAdmin() checks elsewhere in this repo.
export async function POST(req: NextRequest) {
  try {
    const isAdmin = ensureAdmin(req);
    let body: any = null;
    const ct = req.headers.get("content-type") || "";
    let audioBuf: Buffer | null = null;
    let audioMime = "audio/mpeg";
    let audioOrigName = "audio";

    if (ct.includes("application/json")) {
      body = await req.json().catch(() => ({}));
    } else {
      const fd = await req.formData();
      body = Object.fromEntries(fd.entries());
      const audio = fd.get("audio");
      if (audio instanceof File) {
        audioBuf = Buffer.from(await audio.arrayBuffer());
        audioMime = audio.type || "audio/mpeg";
        audioOrigName = String(audio.name || "audio");
      }
    }

    const shareId = String(body.shareId || body.id || "").trim();
    const firstName = String(body.firstName || body.nombre || "").trim();
    const lastName = String(body.lastName || body.apellido || "").trim();
    const phone = String(body.phone || body.telefono || "").trim();
    const email = String(body.email || "").trim();
    const country = String(body.country || body.pais || "").trim();
    const genderRaw = String(body.gender || body.genero || "").trim().toLowerCase();
    const homeStudioRaw = String(body.homeStudio || body.estudio || "").toLowerCase();
    const onlineSessionsRaw = String(body.onlineSessions || body.sesiones || "").toLowerCase();
    const gender = genderRaw === "female" || genderRaw === "femenino" || genderRaw === "f"
      ? "Female"
      : genderRaw === "male" || genderRaw === "masculino" || genderRaw === "m"
      ? "Male"
      : "";

    if (!shareId || (!isAdmin && (!firstName || !lastName))) {
      return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });
    }
    if (!isAdmin && !gender) {
      return NextResponse.json({ ok: false, error: "Indicá si sos masculino o femenino" }, { status: 400 });
    }

    const casting = await getCantanteCasting({ shareId });
    if (!casting) return NextResponse.json({ ok: false, error: "Casting no encontrado" }, { status: 404 });

    if (!isAdmin && casting.deadline && new Date() > new Date(casting.deadline)) {
      return NextResponse.json({ ok: false, error: "Este casting ya cerró" }, { status: 403 });
    }

    if (!isAdmin && email) {
      const dup = await cantanteApplicationExists(shareId, email);
      if (dup) return NextResponse.json({ ok: false, error: "Ya postulaste a este casting" }, { status: 409 });
    }

    let audioUrl: string | null = body.audioUrl ? String(body.audioUrl) : null;
    if (!audioUrl && audioBuf) {
      try {
        audioUrl = await uploadCantanteCastingFile(audioBuf, audioMime, audioOrigName, "cantante-audios");
      } catch (e: any) {
        return NextResponse.json({ ok: false, error: `No se pudo subir el audio: ${e?.message || e}` }, { status: 502 });
      }
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

    notifyCastingCantante({
      nombre: `${firstName} ${lastName}`.trim(),
      email,
      casting: casting.title ?? casting.shareId,
    }).catch(() => {});

    const res = NextResponse.json({ ok: true, application: app });

    // Cookie anti-reenvío
    try {
      const cookieName = `cc_applied_${shareId}`;
      const existing = req.headers.get("cookie") || "";
      let prev = "";
      for (const part of toArray(existing.replace(/;/g, ","))) {
        const p = part.trim();
        if (p.startsWith(cookieName + "=")) {
          prev = decodeURIComponent(p.split("=")[1] || "");
          break;
        }
      }
      const emailKey = email.toLowerCase();
      const list = new Set(prev ? toArray(prev).map(s => s.trim().toLowerCase()).filter(Boolean) : []);
      if (emailKey) list.add(emailKey);
      res.cookies.set(cookieName, encodeURIComponent(Array.from(list).join(",")), { path: "/", maxAge: 60 * 60 * 24 * 365 });
    } catch {}

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
