// Assets y decisiones de diseño por artista — no hay upload UI, así que esto
// sigue viviendo en código, keyeado por `slug`. El contenido de texto (name,
// genre, summary, profileParagraphs, profileHighlights) vive en la tabla
// `artists` de Supabase (ver scripts/artists-roster-schema.sql) y se combina
// con estos assets en lib/artists.ts.
export type ArtistAssets = {
  slug: string;
  menuImage: string;
  menuImageClassName?: string;
  profileBackgroundImage?: string;
  profileMode?: "default" | "background-only" | "mst-desktop";
  accent: string;
};

export const artistAssets: ArtistAssets[] = [
  {
    slug: "vanessa-garcia",
    menuImage: encodeURI("/MENU-PICS/VANESSA GARCIA MENU.jpeg"),
    menuImageClassName: "object-[center_20%]",
    accent: "from-rose-500 via-orange-400 to-amber-300",
  },
  {
    slug: "monica-sin-tilde",
    menuImage: encodeURI("/MENU-PICS/MONICA SIN TILDE MENU.jpg"),
    menuImageClassName: "object-[center_18%]",
    profileBackgroundImage: encodeURI("/MST-WEB/FONDO_MST_WEB.jpg"),
    profileMode: "mst-desktop",
    accent: "from-indigo-500 via-purple-500 to-pink-400",
  },
  {
    slug: "javii-diego-calvo",
    menuImage: encodeURI("/MENU-PICS/JAVII DIEGO MENU.jpg"),
    menuImageClassName: "object-center",
    accent: "from-teal-400 via-cyan-400 to-amber-300",
  },
];
