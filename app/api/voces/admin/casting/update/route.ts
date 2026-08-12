import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { getCasting, updateCasting, uploadCastingFile, type CastingCriteria } from "@/lib/voces-castings";
import { parseCastingBusinessFields } from "@/lib/voces-casting-fields";
import { toArray } from "@/lib/voces-arrays";

// Ported from voces-bds's app/api/admin/casting/update/route.ts.
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const fd = await req.formData();
    const id = String(fd.get("id") || "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const existing = await getCasting({ id });
    if (!existing) return NextResponse.json({ ok: false, error: "Casting not found" }, { status: 404 });

    const titleRaw = fd.get("title");
    const briefRaw = fd.get("brief");
    const videoFile = fd.get("video") as File | null;
    const scriptFile = fd.get("script") as File | null;
    const referenceFile = fd.get("reference") as File | null;
    const videoUrlInput = String(fd.get("videoUrl") || "").trim();
    const scriptUrlInput = String(fd.get("scriptUrl") || "").trim();
    const referenceUrlInput = String(fd.get("referenceUrl") || "").trim();

    const deadlineRaw = fd.get("deadline");
    const critLanguage = String(fd.get("critLanguage") || "").trim();
    const critAccent = String(fd.get("critAccent") || "").trim();
    const critGender = String(fd.get("critGender") || "").trim();
    const critStylesRaw = String(fd.get("critStyles") || "");
    const critAgesRaw = String(fd.get("critAges") || "");
    function parseList(v: string): string[] {
      if (!v) return [];
      try { const j = JSON.parse(v); if (Array.isArray(j)) return j.map(String).filter(Boolean); } catch {}
      return toArray(v).map((s) => s.trim()).filter(Boolean);
    }

    async function fileToUrl(file: File | null, folder: "scripts" | "videos" | "refs"): Promise<string | null> {
      if (!(file instanceof File) || file.size === 0) return null;
      const buf = Buffer.from(await file.arrayBuffer());
      return uploadCastingFile(buf, file.type || "application/octet-stream", file.name || "file", folder);
    }

    const [uploadedVideo, uploadedScript, uploadedRef] = await Promise.all([
      fileToUrl(videoFile, "videos"),
      fileToUrl(scriptFile, "scripts"),
      fileToUrl(referenceFile, "refs"),
    ]);

    const patch: Parameters<typeof updateCasting>[1] = {};
    if (titleRaw !== null) patch.title = String(titleRaw || "");
    if (briefRaw !== null) patch.brief = String(briefRaw || "");
    if (uploadedVideo) patch.videoUrl = uploadedVideo;
    else if (videoUrlInput) patch.videoUrl = videoUrlInput;
    if (uploadedScript) patch.scriptUrl = uploadedScript;
    else if (scriptUrlInput) patch.scriptUrl = scriptUrlInput;
    if (uploadedRef) patch.referenceUrl = uploadedRef;
    else if (referenceUrlInput) patch.referenceUrl = referenceUrlInput;

    if (deadlineRaw !== null) patch.deadline = String(deadlineRaw).trim() || null;

    const hasCriteria = !!(critLanguage || critAccent || critGender || critStylesRaw || critAgesRaw);
    if (hasCriteria) {
      patch.criteria = {
        language: critLanguage || undefined,
        accent: critAccent || undefined,
        gender: critGender || undefined,
        styles: parseList(critStylesRaw),
        ages: parseList(critAgesRaw),
      } as CastingCriteria;
    }

    // Campos de negocio: solo se actualizan los que el form realmente envió.
    Object.assign(patch, parseCastingBusinessFields(fd, { presentOnly: true }));

    const casting = await updateCasting(id, patch);
    return NextResponse.json({ ok: true, casting });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
