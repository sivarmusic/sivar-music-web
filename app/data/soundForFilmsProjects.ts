import { readdirSync } from "node:fs";
import path from "node:path";

export type SoundForFilmsProject = {
  slug: string;
  title: string;
  description: string;
  partnerCredit: string;
  videoSrc: string;
};

const portfolioDirectory = path.join(process.cwd(), "public", "PORTFOLIO");

function stripExtension(filename: string) {
  return filename.replace(/\.[^/.]+$/, "");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

// Titles are derived from the real filenames in public/PORTFOLIO so renames stay synced.
export function getSoundForFilmsProjects(): SoundForFilmsProject[] {
  const portfolioVideoFiles = readdirSync(portfolioDirectory)
    .filter((filename) => /\.(mp4|mov|webm)$/i.test(filename))
    .sort((left, right) => left.localeCompare(right));

  // Add a short description per video here when needed.
  const descriptionsByTitle: Record<string, string> = {
    AEROMEXICO: "MUSIC/SOUND DESIGN/MIX",
    ARREDO: "SOUND DESIGN/MIX",
    "BUHO FILM": "MUSIC/SOUND DESIGN/MIX",
    "DON JULIO": "SOUND DESIGN/MIX",
    "HBO MAX": "SOUND DESIGN/MIX",
    "KFC CARIBE": "MUSIC/SOUND DESIGN/MIX",
    "KFC LATAM": "MUSIC/SOUND DESIGN/MIX",
    MONTELOBOS: "MUSIC/SOUND DESIGN/MIX",
    NISSAN: "SOUND DESIGN/MIX",
    OLYMPICS: "MUSIC/SOUND DESIGN/MIX",
    TECATE: "MUSIC/SOUND DESIGN/MIX",
  };

  const partnerCreditsByTitle: Record<string, string> = {
    AEROMEXICO: "in partnership with BDS creative studio.",
    "BUHO FILM": "in partnership with BDS creative studio.",
    "KFC CARIBE": "in partnership with BDS creative studio.",
    "KFC LATAM": "in partnership with BDS creative studio.",
    MONTELOBOS: "in partnership with BDS creative studio.",
    NISSAN: "in partnership with BDS creative studio.",
    OLYMPICS: "in partnership with BDS creative studio.",
    TECATE: "in partnership with BDS creative studio.",
  };

  return portfolioVideoFiles.map((filename) => {
    const title = stripExtension(filename);

    return {
      slug: slugify(title),
      title,
      description: descriptionsByTitle[title] ?? "",
      partnerCredit: partnerCreditsByTitle[title] ?? "",
      videoSrc: encodeURI(`/PORTFOLIO/${filename}`),
    };
  });
}
