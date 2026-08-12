import { supabase } from "@/lib/supabase";

export const SOUND_FOR_FILMS_BUCKET = "sound-for-films";

/**
 * Signed URLs outlive a viewing session but not much more. Long enough to
 * watch the reel without leaving a link that keeps working tomorrow.
 */
const SIGNED_URL_TTL_SECONDS = 2 * 60 * 60;

/** Combining diacritical marks, left over after NFD normalization. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Anything Supabase Storage will not accept in an object key. */
const UNSAFE_KEY_CHARS = /[^\w\s.-]/g;

/**
 * Builds the storage object key for a catalog filename.
 *
 * Supabase Storage rejects non-ASCII keys ("Invalid key"), so accents are
 * folded and anything left outside the safe set is replaced. Catalog titles
 * keep their original spelling — only the object key is normalized.
 *
 * Keep in sync with the same helper in
 * scripts/migrate-sound-for-films-to-supabase.mjs.
 */
export function toStorageObjectKey(
  type: "full" | "preview",
  filename: string
): string {
  const asciiFilename = filename
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(UNSAFE_KEY_CHARS, "_");

  return `${type}/${asciiFilename}`;
}

/**
 * Mints short-lived signed URLs for private storage objects.
 *
 * Returns a map of storage path -> signed URL. Paths that could not be signed
 * are simply absent, letting callers decide how to degrade.
 */
export async function createSignedVideoUrls(
  paths: string[]
): Promise<Map<string, string>> {
  const signed = new Map<string, string>();
  const uniquePaths = [...new Set(paths)].filter(Boolean);

  if (uniquePaths.length === 0) return signed;

  const { data, error } = await supabase.storage
    .from(SOUND_FOR_FILMS_BUCKET)
    .createSignedUrls(uniquePaths, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return signed;

  for (const entry of data) {
    // `path` mirrors the requested path; entries with an error carry no URL.
    if (entry.path && entry.signedUrl && !entry.error) {
      signed.set(entry.path, entry.signedUrl);
    }
  }

  return signed;
}
