import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { getCantanteCasting, getCantanteApplications } from "@/lib/voces-castings-cantantes";
import { zipSync, strToU8 } from "fflate";

// Ported from voces-bds's app/api/admin/cantantes/casting/results/[id]/download/route.ts.
function sanitizeFilename(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 _()-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}${dd}${yy}`;
}

function extFromUrl(url: string, contentType: string): string {
  const urlExt = url.split("?")[0].match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase();
  if (urlExt && ["mp3", "wav", "ogg", "m4a", "aac", "flac", "webm"].includes(urlExt)) return urlExt;
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "mp3";
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("ogg")) return "ogg";
  if (contentType.includes("m4a") || contentType.includes("mp4")) return "m4a";
  if (contentType.includes("aac")) return "aac";
  if (contentType.includes("flac")) return "flac";
  return "mp3";
}

function isUploaded(url: string): boolean {
  return url.includes("supabase.co") || url.includes("/storage/v1/");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  try {
    const { id: shareId } = await params;
    const casting = await getCantanteCasting({ shareId });
    if (!casting) return NextResponse.json({ ok: false, error: "Casting no encontrado" }, { status: 404 });

    const applications = await getCantanteApplications({ shareId });
    const withAudio = applications.filter((a) => a.audioUrl && isUploaded(a.audioUrl));

    if (withAudio.length === 0) {
      return NextResponse.json({ ok: false, error: "No hay audios subidos para descargar" }, { status: 404 });
    }

    const projectName = sanitizeFilename(casting.title || "Casting Cantantes");
    const files: Record<string, Uint8Array> = {};

    await Promise.all(
      withAudio.map(async (a) => {
        try {
          const res = await fetch(a.audioUrl!);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const contentType = res.headers.get("content-type") || "";
          const ext = extFromUrl(a.audioUrl!, contentType);
          const date = formatDate(a.createdAt);
          const talent = sanitizeFilename(`${a.firstName} ${a.lastName}`);
          const filename = `SIVAR MUSIC CANTANTES ${projectName} ${talent} ${date}.${ext}`;
          const buf = await res.arrayBuffer();
          files[filename] = new Uint8Array(buf);
        } catch {
          // skip failed downloads silently
        }
      })
    );

    const withLinks = applications.filter((a) => a.audioUrl && !isUploaded(a.audioUrl));
    if (withLinks.length > 0) {
      const lines = [
        "Postulaciones con link externo (no incluidas en el ZIP):",
        "",
        ...withLinks.map((a) => `${a.firstName} ${a.lastName}: ${a.audioUrl}`),
      ].join("\n");
      files["links-externos.txt"] = strToU8(lines);
    }

    if (Object.keys(files).length === 0) {
      return NextResponse.json({ ok: false, error: "No se pudo descargar ningún audio" }, { status: 404 });
    }

    const zip = zipSync(files, { level: 0 });
    const zipName = `SIVAR MUSIC CANTANTES ${projectName}.zip`;

    return new Response(zip.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
        "Content-Length": String(zip.byteLength),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
