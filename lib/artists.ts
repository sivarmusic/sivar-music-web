import { supabase } from "@/lib/supabase";
import { artistAssets, type ArtistAssets } from "@/app/data/artists";

export type Artist = ArtistAssets & {
  name: string;
  genre: string;
  summary: string;
  profileParagraphs: string[];
  profileHighlights: string[];
};

// Row shape of the `artists` table, the admin-editable source of truth for
// text content (see scripts/artists-roster-schema.sql).
type ArtistRow = {
  slug: string;
  name: string;
  genre: string;
  summary: string;
  profile_paragraphs: string[];
  profile_highlights: string[];
  visible: boolean;
};

function mergeWithAssets(row: ArtistRow): Artist | null {
  const assets = artistAssets.find((entry) => entry.slug === row.slug);
  if (!assets) return null;

  return {
    ...assets,
    name: row.name,
    genre: row.genre,
    summary: row.summary,
    profileParagraphs: row.profile_paragraphs ?? [],
    profileHighlights: row.profile_highlights ?? [],
  };
}

let hasWarnedAboutMissingAssets = false;

function warnAboutMissingAssets(slug: string) {
  if (hasWarnedAboutMissingAssets) return;
  hasWarnedAboutMissingAssets = true;
  console.warn(
    `[artists] Row with slug "${slug}" has no matching entry in ` +
      `artistAssets (app/data/artists.ts) and was dropped from the result. ` +
      `Add its assets in code to show it on the site.`
  );
}

let hasWarnedAboutArtistsQuery = false;

function warnAboutArtistsQueryFailure(reason: string) {
  if (hasWarnedAboutArtistsQuery) return;
  hasWarnedAboutArtistsQuery = true;
  console.warn(
    `[artists] Could not load the roster from Supabase ("artists": ${reason}). ` +
      `Returning an empty list instead of a hardcoded fallback — check the ` +
      `table and the admin panel.`
  );
}

/**
 * Visible artists for the public roster, ordered for display. Text content
 * (name, genre, summary, profile copy) comes from Supabase; design assets
 * (images, classes, accent) come from artistAssets in code and are merged in
 * by slug. Rows without matching code assets are dropped.
 */
export async function getArtists(): Promise<Artist[]> {
  const { data, error } = await supabase
    .from("artists")
    .select(
      "slug, name, genre, summary, profile_paragraphs, profile_highlights, visible"
    )
    .eq("visible", true)
    .order("sort_order", { ascending: true });

  if (error) {
    warnAboutArtistsQueryFailure(error.message);
    return [];
  }

  const rows = (data ?? []) as ArtistRow[];
  const artists: Artist[] = [];

  for (const row of rows) {
    const merged = mergeWithAssets(row);
    if (!merged) {
      warnAboutMissingAssets(row.slug);
      continue;
    }
    artists.push(merged);
  }

  return artists;
}

/**
 * A single artist by slug for the detail page. Returns null when the row
 * doesn't exist, is hidden (visible=false — same as being deleted from the
 * site, including its direct URL), or has no matching code assets.
 */
export async function getArtistBySlug(slug: string): Promise<Artist | null> {
  const { data, error } = await supabase
    .from("artists")
    .select(
      "slug, name, genre, summary, profile_paragraphs, profile_highlights, visible"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    if (error) warnAboutArtistsQueryFailure(error.message);
    return null;
  }

  const row = data as ArtistRow;
  if (!row.visible) return null;

  const merged = mergeWithAssets(row);
  if (!merged) {
    warnAboutMissingAssets(row.slug);
    return null;
  }

  return merged;
}
