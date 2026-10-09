// Validación compartida de subidas: el file.type lo declara el cliente, así que
// se verifica también la firma de los primeros bytes y la extensión sale del MIME.

export const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export function matchesMime(bytes: Uint8Array, mime: string): boolean {
  const startsWith = (...sig: number[]) => sig.every((b, i) => bytes[i] === b)
  switch (mime) {
    case 'image/jpeg': return startsWith(0xff, 0xd8, 0xff)
    case 'image/png': return startsWith(0x89, 0x50, 0x4e, 0x47)
    case 'image/webp': return startsWith(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45
    case 'application/pdf': return startsWith(0x25, 0x50, 0x44, 0x46)
    default: return false
  }
}

type FileLike = { type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }

export type ImageCheck =
  | { ok: true; bytes: ArrayBuffer; mime: string; ext: string }
  | { ok: false; status: number; error: string }

/** Valida una imagen (jpeg/png/webp, ≤5 MB, firma real). */
export async function validateImage(file: FileLike): Promise<ImageCheck> {
  if (!(IMAGE_MIMES as readonly string[]).includes(file.type)) {
    return { ok: false, status: 400, error: 'Formato no permitido. Usá JPG, PNG o WebP.' }
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, status: 400, error: 'El archivo supera los 5MB' }
  }
  const bytes = await file.arrayBuffer()
  if (!matchesMime(new Uint8Array(bytes.slice(0, 12)), file.type)) {
    return { ok: false, status: 400, error: 'El archivo no coincide con su formato' }
  }
  return { ok: true, bytes, mime: file.type, ext: EXT_BY_MIME[file.type] }
}
