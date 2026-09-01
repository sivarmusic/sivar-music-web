import { NextResponse } from "next/server";
import { getArtists } from "@/lib/artists";

// Público, sin auth: mismos datos que ya se muestran en /artists. Lo usa el
// onboarding de eventos (app/eventos/mi-cuenta/onboarding/page.tsx), un
// client component que necesita la lista de artistas visibles para "seguir".
export async function GET() {
  const artists = await getArtists();

  return NextResponse.json({
    artists: artists.map((artist) => ({
      slug: artist.slug,
      name: artist.name,
      genre: artist.genre,
      menuImage: artist.menuImage,
    })),
  });
}
