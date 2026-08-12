import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { createCantanteCasting, uploadCantanteCastingFile, type CantanteCastingCriteria, type CastingAttachment } from "@/lib/voces-castings-cantantes";
import { parseCastingBusinessFields } from "@/lib/voces-casting-fields";

// Ported from voces-bds's app/api/admin/cantantes/casting/create/route.ts.
function parseList(v: string): string[] {
  if (!v) return [];
  try { const j = JSON.parse(v); if (Array.isArray(j)) return j.map(String).filter(Boolean); } catch {}
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const fd = await req.formData();
    const title = String(fd.get("title") || "");
    const brief = String(fd.get("brief") || "");
    const deadline = String(fd.get("deadline") || "").trim() || null;

    const critStylesRaw = String(fd.get("critStyles") || "");
    const critCountry = String(fd.get("critCountry") || "").trim();
    const critGender = String(fd.get("critGender") || "").trim();
    const critVocalRange = String(fd.get("critVocalRange") || "").trim();

    async function fileToUrl(file: File | null, folder: "cantante-scripts" | "cantante-videos" | "cantante-refs"): Promise<string | null> {
      if (!(file instanceof File) || file.size === 0) return null;
      const buf = Buffer.from(await file.arrayBuffer());
      return uploadCantanteCastingFile(buf, file.type || "application/octet-stream", file.name || "file", folder);
    }

    const videoFile = fd.get("video") as File | null;
    const scriptFile = fd.get("script") as File | null;
    const referenceFile = fd.get("reference") as File | null;

    const [videoUrl, scriptUrl, referenceFileUrl] = await Promise.all([
      fileToUrl(videoFile, "cantante-videos"),
      fileToUrl(scriptFile, "cantante-scripts"),
      fileToUrl(referenceFile, "cantante-refs"),
    ]);

    const finalVideoUrl = videoUrl || String(fd.get("videoUrl") || "") || null;
    const finalScriptUrl = scriptUrl || String(fd.get("scriptUrl") || "") || null;
    const finalReferenceUrl = referenceFileUrl || String(fd.get("referenceUrl") || "") || null;

    // ── Archivos adjuntos múltiples ──────────────────────────────
    const attachmentCount = parseInt(String(fd.get("attachmentCount") || "0"), 10);
    const attachments: CastingAttachment[] = [];
    for (let i = 0; i < attachmentCount; i++) {
      const label = String(fd.get(`attachment_label_${i}`) || "").trim();
      const attFile = fd.get(`attachment_file_${i}`) as File | null;
      let url = String(fd.get(`attachment_url_${i}`) || "").trim();
      if (attFile instanceof File && attFile.size > 0) {
        const buf = Buffer.from(await attFile.arrayBuffer());
        url = await uploadCantanteCastingFile(buf, attFile.type || "application/octet-stream", attFile.name || "file", "cantante-refs");
      }
      if (url) attachments.push({ label: label || "Archivo", url });
    }

    const styles = parseList(critStylesRaw);
    const hasCriteria = !!(styles.length || critCountry || critGender || critVocalRange);
    const criteria: CantanteCastingCriteria | undefined = hasCriteria
      ? { styles, country: critCountry || undefined, gender: critGender || undefined, vocalRange: critVocalRange || undefined }
      : undefined;

    const business = parseCastingBusinessFields(fd);

    const casting = await createCantanteCasting({
      title,
      brief,
      videoUrl: finalVideoUrl,
      scriptUrl: finalScriptUrl,
      referenceUrl: finalReferenceUrl,
      attachments,
      deadline,
      criteria,
      ...business,
    });
    return NextResponse.json({ ok: true, casting, url: `/voces/cc/${casting.shareId}` });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Error interno" }, { status: 500 });
  }
}
