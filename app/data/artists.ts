export type Artist = {
  name: string;
  slug: string;
  genre: string;
  menuImage: string;
  menuImageClassName?: string;
  summary: string;
  accent: string;
};

export const artists: Artist[] = [
  {
    name: "Vanessa García",
    slug: "vanessa-garcia",
    genre: "Pop / Vocal",
    menuImage: encodeURI("/MENU-PICS/VANESSA GARCIA MENU.jpeg"),
    menuImageClassName: "object-[center_20%]",
    summary: "A fearless voice blending classic hooks with modern pop energy.",
    accent: "from-rose-500 via-orange-400 to-amber-300",
  },
  {
    name: "Monica Sin Tilde",
    slug: "monica-sin-tilde",
    genre: "Indie / Alt",
    menuImage: encodeURI("/MENU-PICS/MONICA SIN TILDE MENU.jpg"),
    menuImageClassName: "object-[center_18%]",
    summary: "Cinematic melodies and left-field textures with intimate lyrics.",
    accent: "from-indigo-500 via-purple-500 to-pink-400",
  },
  {
    name: "Javii y Diego Calvo",
    slug: "javii-diego-calvo",
    genre: "Urban / Acoustic",
    menuImage: encodeURI("/MENU-PICS/JAVII DIEGO MENU.jpg"),
    menuImageClassName: "object-center",
    summary:
      "A shared profile bringing together Javii and Diego Calvo in a single Entertainment entry.",
    accent: "from-teal-400 via-cyan-400 to-amber-300",
  },
];
