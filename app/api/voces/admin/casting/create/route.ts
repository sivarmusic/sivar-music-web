import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { createCasting, uploadCastingFile, type CastingCriteria } from "@/lib/voces-castings";
import { parseCastingBusinessFields } from "@/lib/voces-casting-fields";
import { toArray } from "@/lib/voces-arrays";

// Ported from voces-bds's app/api/admin/casting/create/route.ts.
export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const fd = await req.formData();
    const title = String(fd.get("title") || "");
    const brief = String(fd.get("brief") || "");
    const deadline = String(fd.get("deadline") || "").trim() || null;

    const critLanguage = String(fd.get("critLanguage") || "").trim();
    const critAccent = String(fd.get("critAccent") || "").trim();
    const critGender = String(fd.get("critGender") || "").trim();
    const critStylesRaw = String(fd.get("critStyles") || "");
    const critAgesRaw = String(fd.get("critAges") || "");

    function parseList(v: string): string[] {
      if (!v) return [];
      try {
        const j = JSON.parse(v);
        if (Array.isArray(j)) return j.map((x) => String(x)).filter(Boolean);
      } catch {}
      return toArray(v).map((s) => s.trim()).filter(Boolean);
    }

    async function fileToUrl(file: File | null, folder: "scripts" | "videos" | "refs"): Promise<string | null> {
      if (!(file instanceof File) || file.size === 0) return null;
      const buf = Buffer.from(await file.arrayBuffer());
      return uploadCastingFile(buf, file.type || "application/octet-stream", file.name || "file", folder);
    }

    const videoFile = fd.get("video") as File | null;
    const scriptFile = fd.get("script") as File | null;
    const referenceFile = fd.get("reference") as File | null;

    const [videoUrl, scriptUrl, referenceFileUrl] = await Promise.all([
      fileToUrl(videoFile, "videos"),
      fileToUrl(scriptFile, "scripts"),
      fileToUrl(referenceFile, "refs"),
    ]);

    const finalVideoUrl = videoUrl || String(fd.get("videoUrl") || "") || null;
    const finalScriptUrl = scriptUrl || String(fd.get("scriptUrl") || "") || null;
    const finalReferenceUrl = referenceFileUrl || String(fd.get("referenceUrl") || "") || null;

    const hasCriteria = !!(critLanguage || critAccent || critGender || critStylesRaw || critAgesRaw);
    const criteria: CastingCriteria | undefined = hasCriteria
      ? {
          language: critLanguage || undefined,
          accent: critAccent || undefined,
          gender: critGender || undefined,
          styles: parseList(critStylesRaw),
          ages: parseList(critAgesRaw),
        }
      : undefined;

    const business = parseCastingBusinessFields(fd);

    const casting = await createCasting({
      title,
      brief,
      videoUrl: finalVideoUrl,
      scriptUrl: finalScriptUrl,
      referenceUrl: finalReferenceUrl,
      deadline,
      criteria,
      ...business,
    });

    return NextResponse.json({ ok: true, casting, url: `/voces/c/${casting.shareId}` });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Error interno" }, { status: 500 });
  }
}
