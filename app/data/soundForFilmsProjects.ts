import blobManifest from "./soundForFilmsBlobManifest.json";
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

type SoundForFilmsCatalogEntry = {
  filename: string;
  title: string;
  description: string;
  partnerCredit?: string;
  previewFilename?: string;
};

type SoundForFilmsBlobManifest = {
  generatedAt: string | null;
  full: Record<string, string>;
  preview: Record<string, string>;
};

const soundForFilmsCatalog: SoundForFilmsCatalogEntry[] = [
  {
    filename: "BINTER.mp4",
    title: "BINTER",
    description: "SOUND DESIGN/MIX",
  },
  {
    filename: "CORONA 100 AÑOS.mp4",
    title: "CORONA 100 AÑOS",
    description: "SOUND DESIGN/MIX",
    partnerCredit: "in partnership with BDS creative studio.",
  },
  {
    filename: "JEAN PAUL GAULTIER.mp4",
    title: "JEAN PAUL GAULTIER",
    description: "SOUND DESIGN/MIX",
    partnerCredit: "in partnership with BDS creative studio.",
  },
  {
    filename: "DON JULIO.mp4",
    title: "DON JULIO",
    description: "SOUND DESIGN/MIX",
  },
  {
    filename: "GOOGLE PIXEL.mp4",
    title: "GOOGLE PIXEL",
    description: "SOUND DESIGN/MIX",
    partnerCredit: "in partnership with BDS creative studio.",
  },
  {
    filename: "AEROMEXICO.mp4",
    title: "AEROMEXICO",
    description: "MUSIC/SOUND DESIGN/MIX",
    partnerCredit: "in partnership with BDS creative studio.",
  },
  {
    filename: "ARREDO.mp4",
    title: "ARREDO",
    description: "SOUND DESIGN/MIX",
  },
  {
    filename: "BUHO FILM.mp4",
    title: "BUHO FILM",
    description: "MUSIC/SOUND DESIGN/MIX",
    partnerCredit: "in partnership with BDS creative studio.",
  },
  {
    filename: "CHEVROLET.mp4",
    title: "CHEVROLET",
    description: "SOUND DESIGN/MIX",
    partnerCredit: "in partnership with BDS creative studio.",
  },
  {
    filename: "HBO MAX.mp4",
    title: "HBO MAX",
    description: "SOUND DESIGN/MIX",
  },
  {
    filename: "KFC CARIBE.mp4",
    title: "KFC CARIBE",
    description: "MUSIC/SOUND DESIGN/MIX",
    partnerCredit: "in partnership with BDS creative studio.",
  },
  {
    filename: "KFC LATAM.mp4",
    title: "KFC LATAM",
    description: "MUSIC/SOUND DESIGN/MIX",
    partnerCredit: "in partnership with BDS creative studio.",
  },
  {
    filename: "MONTELOBOS.mp4",
    title: "MONTELOBOS",
    description: "MUSIC/SOUND DESIGN/MIX",
    partnerCredit: "in partnership with BDS creative studio.",
  },
  {
    filename: "NISSAN.mp4",
    title: "NISSAN",
    description: "SOUND DESIGN/MIX",
    partnerCredit: "in partnership with BDS creative studio.",
  },
  {
    filename: "OLYMPICS.mp4",
    title: "OLYMPICS",
    description: "MUSIC/SOUND DESIGN/MIX",
    partnerCredit: "in partnership with BDS creative studio.",
  },
  {
    filename: "SPORTS DIRECT.mp4",
    title: "SPORTS DIRECT",
    description: "MUSIC/SOUND DESIGN/MIX",
    partnerCredit: "in partnership with BDS creative studio.",
  },
  {
    filename: "TECATE.mp4",
    title: "TECATE",
    description: "MUSIC/SOUND DESIGN/MIX",
    partnerCredit: "in partnership with BDS creative studio.",
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

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

/**
 * Resolves playable video URLs for the showcase.
 *
 * Videos live in a private Supabase bucket and are served through signed URLs
 * minted per request, so a shared link stops working once it expires. Files
 * that are not in the bucket yet fall back to the legacy public blob manifest
 * so the page keeps rendering during the migration.
 */
export async function getSoundForFilmsProjects(): Promise<
  SoundForFilmsProject[]
> {
  const paths = soundForFilmsCatalog.flatMap((entry) => [
    toStorageObjectKey("full", entry.filename),
    toStorageObjectKey("preview", entry.previewFilename ?? entry.filename),
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

  const projects = soundForFilmsCatalog.map((entry) => ({
    slug: slugify(entry.title),
    title: entry.title,
    description: entry.description,
    partnerCredit: entry.partnerCredit ?? "",
    previewVideoSrc: resolve(
      "preview",
      entry.previewFilename ?? entry.filename,
      previewVideoBaseUrl
    ),
    videoSrc: resolve("full", entry.filename, fullVideoBaseUrl),
  }));

  if (missing > 0) warnAboutLegacyFallback(missing);

  return projects;
}
