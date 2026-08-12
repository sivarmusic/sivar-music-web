import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/voces-auth";
import { uploadCastingFile, updateApplicationAudioUrl } from "@/lib/voces-castings";

// Ported from voces-bds's app/api/admin/casting/application/import-audio/route.ts.
//  - Auth: fetch("/api/auth/me") -> ensureAdmin(req).
//  - No Drive API/credentials involved here: `downloadBuffer` just does a
//    plain `fetch()` against a candidate-submitted external link (which may
//    happen to be a public Google Drive "download" URL or a Dropbox share
//    link) and re-uploads the bytes into voces-casting-files via
//    uploadCastingFile. Kept as-is.
function extractDriveFileId(url: string): string | null {
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  return null;
}

function toDropboxDirect(url: string): string {
  return url.replace(/[?&]dl=0/, "").replace("www.dropbox.com", "dl.dropboxusercontent.com");
}

async function downloadBuffer(url: string): Promise<{ buffer: Buffer; mimeType: string; ext: string }> {
  const driveId = extractDriveFileId(url);

  if (driveId) {
    const directUrl = `https://drive.usercontent.google.com/download?id=${driveId}&export=download&authuser=0`;
    const res = await fetch(directUrl, { redirect: "follow" });
    if (!res.ok) throw new Error(`Google Drive respondió ${res.status}`);
    const ctype = res.headers.get("content-type") || "";
    if (ctype.includes("text/html")) {
      const legacyUrl = `https://drive.google.com/uc?export=download&id=${driveId}&confirm=t`;
      const res2 = await fetch(legacyUrl, { redirect: "follow" });
      if (!res2.ok) throw new Error(`No se pudo descargar de Google Drive (${res2.status})`);
      const ctype2 = res2.headers.get("content-type") || "";
      if (ctype2.includes("text/html")) throw new Error("Google Drive requiere permisos adicionales o el archivo no es público");
      const buf = Buffer.from(await res2.arrayBuffer());
      const ext = ctype2.includes("mpeg") || ctype2.includes("mp3") ? "mp3" : ctype2.includes("wav") ? "wav" : ctype2.includes("ogg") ? "ogg" : "mp3";
      return { buffer: buf, mimeType: ctype2.split(";")[0].trim(), ext };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = ctype.includes("mpeg") || ctype.includes("mp3") ? "mp3" : ctype.includes("wav") ? "wav" : ctype.includes("ogg") ? "ogg" : "mp3";
    return { buffer: buf, mimeType: ctype.split(";")[0].trim(), ext };
  }

  const fetchUrl = url.includes("dropbox.com") ? toDropboxDirect(url) : url;
  const res = await fetch(fetchUrl, { redirect: "follow" });
  if (!res.ok) throw new Error(`El servidor remoto respondió ${res.status}`);
  const ctype = res.headers.get("content-type") || "audio/mpeg";
  if (ctype.includes("text/html")) throw new Error("El link no apunta a un archivo de audio descargable");
  const buf = Buffer.from(await res.arrayBuffer());
  const extMatch = fetchUrl.match(/\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : "mp3";
  return { buffer: buf, mimeType: ctype.split(";")[0].trim(), ext };
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  try {
    const { applicationId, audioUrl: externalUrl } = await req.json();
    if (!applicationId || !externalUrl) {
      return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });
    }

    const { buffer, mimeType, ext } = await downloadBuffer(externalUrl);

    if (buffer.length > 50 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "El archivo supera los 50 MB" }, { status: 413 });
    }

    const publicUrl = await uploadCastingFile(buffer, mimeType, `imported-${applicationId}.${ext}`, "audios");

    await updateApplicationAudioUrl(applicationId, publicUrl, externalUrl);

    return NextResponse.json({ ok: true, audioUrl: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
