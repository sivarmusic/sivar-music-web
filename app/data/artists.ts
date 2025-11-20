export type Artist = {
  name: string;
  slug: string;
  genre: string;
  summary: string;
  accent: string;
};

export const artists: Artist[] = [
  {
    name: "Vanessa García",
    slug: "vanessa-garcia",
    genre: "Pop / Vocal",
    summary: "A fearless voice blending classic hooks with modern pop energy.",
    accent: "from-rose-500 via-orange-400 to-amber-300",
  },
  {
    name: "Monica Sin Tilde",
    slug: "monica-sin-tilde",
    genre: "Indie / Alt",
    summary: "Cinematic melodies and left-field textures with intimate lyrics.",
    accent: "from-indigo-500 via-purple-500 to-pink-400",
  },
  {
    name: "Javii",
    slug: "javii",
    genre: "Urban / R&B",
    summary: "Smooth rhythms, layered vocals, and a kinetic live presence.",
    accent: "from-teal-400 via-cyan-400 to-blue-500",
  },
  {
    name: "Diego Calvo",
    slug: "diego-calvo",
    genre: "Folk / Acoustic",
    summary: "Story-driven songwriting with warm acoustic arrangements.",
    accent: "from-emerald-400 via-lime-400 to-amber-400",
  },
  {
    name: "Adri Mojica",
    slug: "adri-mojica",
    genre: "Soul / R&B",
    summary: "Velvet vocals over neo-soul grooves and late-night moods.",
    accent: "from-sky-400 via-blue-500 to-indigo-500",
  },
];
