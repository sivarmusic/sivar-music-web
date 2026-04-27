import { put, list } from "@vercel/blob";

export type CreatorStats = {
  updatedAt: string;
  score: number;
  instagram: {
    followers: number;
    weeklyGrowth: number;
    er: number;
    reach: number;
    impressions: number;
    bestTime: string;
    postingFrequency: string;
  };
  tiktok: {
    followers: number;
    er: number;
    weeklyViews: number;
  };
  spotify: {
    monthlyListeners: number;
    followers: number;
    streamsThisMonth: number;
  };
  youtube: {
    subscribers: number;
    viewsThisMonth: number;
    watchTimeHours: number;
  };
  latestPost: {
    views: number;
    percentAboveAverage: number;
    platform: "instagram" | "tiktok";
  };
};

const BLOB_PATH = (slug: string) => `creator-stats/${slug}.json`;

export async function getCreatorStats(
  slug: string
): Promise<CreatorStats | null> {
  try {
    const { blobs } = await list({ prefix: BLOB_PATH(slug) });
    if (!blobs.length) return null;
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function saveCreatorStats(
  slug: string,
  stats: CreatorStats
): Promise<void> {
  await put(BLOB_PATH(slug), JSON.stringify(stats), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}
