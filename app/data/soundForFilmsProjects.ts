import blobManifest from "./soundForFilmsBlobManifest.json";

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
    filename: "CORONA 100 AÑOS.mp4",
    title: "CORONA 100 AÑOS",
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
    filename: "HBO MAX.mp4",
    title: "HBO MAX",
    description: "SOUND DESIGN/MIX",
  },
  {
    filename: "JEAN PAUL GAULTIER.mp4",
    title: "JEAN PAUL GAULTIER",
    description: "SOUND DESIGN/MIX",
    partnerCredit: "in partnership with BDS creative studio.",
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

export function getSoundForFilmsProjects(): SoundForFilmsProject[] {
  return soundForFilmsCatalog.map((entry) => ({
    slug: slugify(entry.title),
    title: entry.title,
    description: entry.description,
    partnerCredit: entry.partnerCredit ?? "",
    previewVideoSrc: resolveBlobOrFallbackUrl(
      entry.previewFilename ?? entry.filename,
      "preview",
      previewVideoBaseUrl
    ),
    videoSrc: resolveBlobOrFallbackUrl(entry.filename, "full", fullVideoBaseUrl),
  }));
}
