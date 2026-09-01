import blobManifest from "./soundForFilmsBlobManifest.json";
import { supabase } from "@/lib/supabase";
import {
  createSignedVideoUrls,
  toStorageObjectKey,
} from "@/lib/sound-for-films-videos";

export type SoundForFilmsProject = {
  slug: string;
  title: string;
  description: string;
  partnerCredit: string;
  previewVideoSrc: string;
  videoSrc: string;
};

// Row shape of the `sound_for_films_videos` table, the admin-editable source
// of truth (see scripts/sound-for-films-videos-schema.sql). Only the columns
// the showcase needs are selected.
type SoundForFilmsVideoRow = {
  slug: string;
  filename: string;
  preview_filename: string | null;
  title: string;
  description: string;
  partner_credit: string;
};

type SoundForFilmsBlobManifest = {
  generatedAt: string | null;
  full: Record<string, string>;
  preview: Record<string, string>;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function buildVideoUrl(baseUrl: string, filename: string) {
  return encodeURI(`${trimTrailingSlash(baseUrl)}/${filename}`);
}

const soundForFilmsBlobManifest = blobManifest as SoundForFilmsBlobManifest;
const LOCAL_VIDEO_BASE_URL = "/PORTFOLIO";

// Explicit env overrides still win, but the generated Vercel Blob manifest
// removes the need to wire base URLs for deploys once assets are uploaded.
const fullVideoBaseUrl =
  process.env.SOUND_FOR_FILMS_VIDEO_BASE_URL ??
  process.env.NEXT_PUBLIC_SOUND_FOR_FILMS_VIDEO_BASE_URL ??
  "";

const previewVideoBaseUrl =
  process.env.SOUND_FOR_FILMS_PREVIEW_BASE_URL ??
  process.env.NEXT_PUBLIC_SOUND_FOR_FILMS_PREVIEW_BASE_URL ??
  fullVideoBaseUrl;

function resolveBlobOrFallbackUrl(
  filename: string,
  type: "full" | "preview",
  envBaseUrl: string
) {
  if (envBaseUrl) {
    return buildVideoUrl(envBaseUrl, filename);
  }

  const manifestUrl =
    type === "full"
      ? soundForFilmsBlobManifest.full[filename]
      : soundForFilmsBlobManifest.preview[filename];

  return manifestUrl ?? buildVideoUrl(LOCAL_VIDEO_BASE_URL, filename);
}

let hasWarnedAboutMissingStorage = false;

function warnAboutLegacyFallback(missing: number) {
  if (hasWarnedAboutMissingStorage) return;
  hasWarnedAboutMissingStorage = true;
  console.warn(
    `[sound-for-films] ${missing} video(s) could not be signed from the private ` +
      `"sound-for-films" bucket and fell back to legacy public URLs. Those URLs ` +
      `are permanent and unauthenticated — run ` +
      `scripts/migrate-sound-for-films-to-supabase.mjs to close the gap.`
  );
}

let hasWarnedAboutVideosQuery = false;

function warnAboutVideosQueryFailure(reason: string) {
  if (hasWarnedAboutVideosQuery) return;
  hasWarnedAboutVideosQuery = true;
  console.warn(
    `[sound-for-films] Could not load the video catalog from Supabase ` +
      `("sound_for_films_videos": ${reason}). Returning an empty list instead ` +
      `of a hardcoded fallback — check the table and the admin panel.`
  );
}

/**
 * Resolves playable video URLs for the showcase.
 *
 * The catalog itself (title, description, partner credit, visible/hidden,
 * ordering) is admin-editable and lives in the `sound_for_films_videos`
 * table — see app/sound-for-films/admin/VideoManager.tsx. Videos live in a
 * private Supabase bucket and are served through signed URLs minted per
 * request, so a shared link stops working once it expires. Files that are
 * not in the bucket yet fall back to the legacy public blob manifest so the
 * page keeps rendering during the migration.
 */
export async function getSoundForFilmsProjects(): Promise<
  SoundForFilmsProject[]
> {
  const { data, error } = await supabase
    .from("sound_for_films_videos")
    .select("slug, filename, preview_filename, title, description, partner_credit")
    .eq("visible", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    warnAboutVideosQueryFailure(error?.message ?? "no visible rows");
    return [];
  }

  const catalog = data as SoundForFilmsVideoRow[];

  const paths = catalog.flatMap((entry) => [
    toStorageObjectKey("full", entry.filename),
    toStorageObjectKey("preview", entry.preview_filename ?? entry.filename),
  ]);

  const signedUrls = await createSignedVideoUrls(paths);
  let missing = 0;

  const resolve = (
    type: "full" | "preview",
    filename: string,
    envBaseUrl: string
  ) => {
    const signed = signedUrls.get(toStorageObjectKey(type, filename));
    if (signed) return signed;

    missing += 1;
    return resolveBlobOrFallbackUrl(filename, type, envBaseUrl);
  };

  const projects = catalog.map((entry) => ({
    slug: entry.slug,
    title: entry.title,
    description: entry.description,
    partnerCredit: entry.partner_credit ?? "",
    previewVideoSrc: resolve(
      "preview",
      entry.preview_filename ?? entry.filename,
      previewVideoBaseUrl
    ),
    videoSrc: resolve("full", entry.filename, fullVideoBaseUrl),
  }));

  if (missing > 0) warnAboutLegacyFallback(missing);

  return projects;
}
