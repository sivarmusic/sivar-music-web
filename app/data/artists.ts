export type Artist = {
  name: string;
  slug: string;
  genre: string;
  menuImage: string;
  menuImageClassName?: string;
  summary: string;
  accent: string;
  profileParagraphs: string[];
  profileHighlights: string[];
};

export const artists: Artist[] = [
  {
    name: "Vanessa García",
    slug: "vanessa-garcia",
    genre: "POP / POP ROCK",
    menuImage: encodeURI("/MENU-PICS/VANESSA GARCIA MENU.jpeg"),
    menuImageClassName: "object-[center_20%]",
    summary:
      "Una artista salvadoreña con una identidad femenina fuerte, que combina instinto pop, actitud rock y una dirección visual muy marcada.",
    accent: "from-rose-500 via-orange-400 to-amber-300",
    profileParagraphs: [
      "Vanessa García es una artista salvadoreña con una identidad femenina fuerte, donde conviven el instinto pop, la actitud rock y una dirección visual claramente definida.",
      "Su propuesta se mueve entre presencia, sensibilidad y carácter, construyendo una narrativa artística que se sostiene tanto en la canción como en la imagen.",
      "Dentro de Sivar Music Entertainment, su perfil se entiende como una voz con personalidad propia, pensada para crecer desde una dirección creativa coherente y contemporánea.",
    ],
    profileHighlights: [
      "Identidad femenina fuerte",
      "Instinto pop con actitud rock",
      "Dirección visual muy marcada",
    ],
  },
  {
    name: "monica sin tilde",
    slug: "monica-sin-tilde",
    genre: "POP / URBAN POP",
    menuImage: encodeURI("/MENU-PICS/MONICA SIN TILDE MENU.jpg"),
    menuImageClassName: "object-[center_18%]",
    summary:
      "Una voz introspectiva y contemporánea que construye canciones íntimas, con texturas alternativas y una identidad profundamente personal.",
    accent: "from-indigo-500 via-purple-500 to-pink-400",
    profileParagraphs: [
      "monica sin tilde es una voz introspectiva y contemporánea que trabaja desde la intimidad, el detalle y una identidad profundamente personal.",
      "Sus canciones parten de emociones cercanas y se abren a texturas alternativas que le dan un tono actual, sensible y honesto.",
      "Dentro de Sivar Music Entertainment, su perfil se desarrolla desde una visión artística enfocada en construir un universo propio, delicado pero definido.",
    ],
    profileHighlights: [
      "Canciones íntimas",
      "Texturas alternativas",
      "Identidad profundamente personal",
    ],
  },
  {
    name: "Javii y Diego Calvo",
    slug: "javii-diego-calvo",
    genre: "PRODUCCIÓN / COMPOSICIÓN",
    menuImage: encodeURI("/MENU-PICS/JAVII DIEGO MENU.jpg"),
    menuImageClassName: "object-center",
    summary:
      "Un dúo creativo que desarrolla música desde la producción, la composición y una visión sonora propia dentro del universo de Sivar Music Entertainment.",
    accent: "from-teal-400 via-cyan-400 to-amber-300",
    profileParagraphs: [
      "Javii y Diego Calvo conforman un perfil compartido centrado en la producción y la composición como punto de partida creativo.",
      "Su trabajo se desarrolla desde una visión sonora propia, donde las ideas toman forma a través de decisiones de estructura, atmósfera y dirección musical.",
      "Dentro de Sivar Music Entertainment, este dúo representa una búsqueda enfocada en crear música con identidad, criterio y una sensibilidad contemporánea.",
    ],
    profileHighlights: [
      "Producción y composición",
      "Visión sonora propia",
      "Búsqueda contemporánea con identidad",
    ],
  },
];
