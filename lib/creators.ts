export type PostType = "reel" | "carousel" | "photo";
export type Platform = "instagram" | "tiktok";
export type AgendaType = "brand" | "shoot" | "event" | "personal";

export type Post = {
  id: string;
  caption: string;
  date: string;
  views: number;
  likes: number;
  comments: number;
  er: number;
  type: PostType;
  platform: Platform;
};

export type AgendaItem = {
  date: string;
  title: string;
  description?: string;
  type: AgendaType;
};

export type Hashtag = {
  tag: string;
  avgEngagement: number;
  multiplier: number;
};

export type Creator = {
  slug: string;
  name: string;
  displayName: string;
  password: string;
  emoji: string;
  bio: string;
  instagram: {
    handle: string;
    followers: number;
    er: number;
    weeklyGrowth: number;
    postingFrequency: string;
    bestTime: string;
  };
  tiktok: {
    handle: string;
    followers: number;
    er: number;
  };
  score: number;
  todayTask: {
    title: string;
    audienceRequest: string;
    format: string;
    category: string;
  };
  agenda: AgendaItem[];
  topPosts: Post[];
  topHashtags: Hashtag[];
  audienceTopics: string[];
  audienceWords: string[];
  contentCategories: string[];
  latestPostPerformance: {
    views: number;
    percentAboveAverage: number;
    platform: Platform;
  };
};

const creators: Creator[] = [
  {
    slug: "javii",
    name: "Javii",
    displayName: "Javii",
    password: "javii2026",
    emoji: "🎵",
    bio: "Artista & productor musical",
    instagram: {
      handle: "@javii",
      followers: 85000,
      er: 6.2,
      weeklyGrowth: 320,
      postingFrequency: "cada ~3 días",
      bestTime: "18:00 - 21:00",
    },
    tiktok: {
      handle: "@javii",
      followers: 112000,
      er: 9.4,
    },
    score: 63,
    todayTask: {
      title: "Behind the scenes del estudio — cómo nace una canción",
      audienceRequest:
        'Tu audiencia pregunta: "¿Cómo produces una canción desde cero?"',
      format: "REEL",
      category: "Proceso creativo",
    },
    agenda: [
      {
        date: "2026-04-28",
        title: "Sesión de grabación",
        description: "Grabar voces para el nuevo sencillo",
        type: "shoot",
      },
      {
        date: "2026-04-30",
        title: "Entrevista podcast",
        description: "Podcast Música sin filtros",
        type: "event",
      },
      {
        date: "2026-05-03",
        title: "Shooting de contenido",
        description: "Fotos y videos para redes",
        type: "shoot",
      },
    ],
    topPosts: [
      {
        id: "1",
        caption: "Así suena cuando todo encaja en el estudio 🎧",
        date: "2026-04-10",
        views: 420000,
        likes: 28000,
        comments: 890,
        er: 6.9,
        type: "reel",
        platform: "instagram",
      },
      {
        id: "2",
        caption: "Nueva música viene. No te me duermas 🔥",
        date: "2026-03-28",
        views: 310000,
        likes: 19500,
        comments: 640,
        er: 6.5,
        type: "reel",
        platform: "tiktok",
      },
      {
        id: "3",
        caption: "Mi proceso para escribir letras que conectan",
        date: "2026-03-15",
        views: 180000,
        likes: 12000,
        comments: 520,
        er: 7.0,
        type: "carousel",
        platform: "instagram",
      },
    ],
    topHashtags: [
      { tag: "#musicalatina", avgEngagement: 28400, multiplier: 4.2 },
      { tag: "#productor", avgEngagement: 19800, multiplier: 3.1 },
      { tag: "#estudio", avgEngagement: 15200, multiplier: 2.8 },
      { tag: "#newmusic", avgEngagement: 12600, multiplier: 2.3 },
      { tag: "#artista", avgEngagement: 9800, multiplier: 1.9 },
    ],
    audienceTopics: [
      "Proceso de producción musical",
      "Vida detrás de cámara",
      "Nuevos lanzamientos",
      "Colaboraciones con otros artistas",
      "Consejos para músicos",
    ],
    audienceWords: ["fuego", "bro", "cuándo sale", "colabora con", "apoya"],
    contentCategories: [
      "Música / Producción",
      "Lifestyle de artista",
      "Motivación",
      "Humor",
    ],
    latestPostPerformance: {
      views: 420000,
      percentAboveAverage: 87,
      platform: "instagram",
    },
  },
  {
    slug: "monica",
    name: "Monica",
    displayName: "Monica",
    password: "monica2026",
    emoji: "✨",
    bio: "Creadora de contenido lifestyle & moda",
    instagram: {
      handle: "@monica",
      followers: 340000,
      er: 5.8,
      weeklyGrowth: 890,
      postingFrequency: "cada ~2 días",
      bestTime: "07:00 - 10:00",
    },
    tiktok: {
      handle: "@monica",
      followers: 520000,
      er: 11.2,
    },
    score: 71,
    todayTask: {
      title: "Get ready with me para una cena especial",
      audienceRequest:
        'Tu audiencia pregunta: "¿Qué outfit usas para salir de noche?"',
      format: "REEL",
      category: "Moda / Lifestyle",
    },
    agenda: [
      {
        date: "2026-04-28",
        title: "Campaña Zara",
        description: "Shooting de look primavera",
        type: "brand",
      },
      {
        date: "2026-04-29",
        title: "Brunch con amigas",
        description: "Contenido lifestyle",
        type: "personal",
      },
      {
        date: "2026-05-02",
        title: "Evento Dior",
        description: "Lanzamiento colección verano",
        type: "event",
      },
    ],
    topPosts: [
      {
        id: "1",
        caption: "El look que no me esperaba amarar tanto 🤍",
        date: "2026-04-12",
        views: 890000,
        likes: 52000,
        comments: 1840,
        er: 6.1,
        type: "reel",
        platform: "instagram",
      },
      {
        id: "2",
        caption: "Mi rutina de mañana honesta (sin filtros)",
        date: "2026-03-30",
        views: 620000,
        likes: 38000,
        comments: 1200,
        er: 6.3,
        type: "reel",
        platform: "tiktok",
      },
      {
        id: "3",
        caption: "10 básicos que uso TODO el tiempo",
        date: "2026-03-18",
        views: 410000,
        likes: 24000,
        comments: 980,
        er: 6.1,
        type: "carousel",
        platform: "instagram",
      },
    ],
    topHashtags: [
      { tag: "#ootd", avgEngagement: 52000, multiplier: 5.8 },
      { tag: "#modamujer", avgEngagement: 38000, multiplier: 4.2 },
      { tag: "#lifestyle", avgEngagement: 29000, multiplier: 3.4 },
      { tag: "#outfit", avgEngagement: 22000, multiplier: 2.9 },
      { tag: "#lookdeldia", avgEngagement: 16000, multiplier: 2.1 },
    ],
    audienceTopics: [
      "Moda y outfits del día",
      "Rutinas de belleza",
      "Vida personal y relaciones",
      "Viajes y lifestyle",
      "Recomendaciones de productos",
    ],
    audienceWords: ["hermosa", "linda", "donde compras", "que marca", "inspo"],
    contentCategories: [
      "Moda / Outfits",
      "Belleza",
      "Lifestyle",
      "Viajes",
      "Humor",
    ],
    latestPostPerformance: {
      views: 890000,
      percentAboveAverage: 134,
      platform: "instagram",
    },
  },
  {
    slug: "vanessa",
    name: "Vanessa",
    displayName: "Vanessa",
    password: "vanessa2026",
    emoji: "🌿",
    bio: "Creadora de contenido wellness & maternidad",
    instagram: {
      handle: "@vanessa",
      followers: 210000,
      er: 8.1,
      weeklyGrowth: 560,
      postingFrequency: "cada ~2 días",
      bestTime: "08:00 - 11:00",
    },
    tiktok: {
      handle: "@vanessa",
      followers: 180000,
      er: 12.4,
    },
    score: 68,
    todayTask: {
      title: "3 cosas que cambié en mi mañana y que transformaron mi día",
      audienceRequest:
        'Tu audiencia pregunta: "¿Cómo organizas tu día con hijos?"',
      format: "REEL",
      category: "Wellness / Maternidad",
    },
    agenda: [
      {
        date: "2026-04-28",
        title: "Sesión de fotos familia",
        description: "Contenido de vida en familia",
        type: "shoot",
      },
      {
        date: "2026-05-01",
        title: "Campaña marca wellness",
        description: "Review de suplementos naturales",
        type: "brand",
      },
      {
        date: "2026-05-05",
        title: "Workshop online",
        description: "Taller de organización para mamás",
        type: "event",
      },
    ],
    topPosts: [
      {
        id: "1",
        caption: "Lo que nadie te dice sobre ser mamá y creadora de contenido",
        date: "2026-04-11",
        views: 560000,
        likes: 45000,
        comments: 2100,
        er: 8.4,
        type: "reel",
        platform: "instagram",
      },
      {
        id: "2",
        caption: "Mi rutina de bienestar en 5 minutos (sí, se puede) 🌿",
        date: "2026-03-29",
        views: 380000,
        likes: 31000,
        comments: 1450,
        er: 8.5,
        type: "reel",
        platform: "tiktok",
      },
      {
        id: "3",
        caption: "Lo que como en un día siendo mamá de dos",
        date: "2026-03-16",
        views: 290000,
        likes: 23000,
        comments: 1100,
        er: 8.3,
        type: "carousel",
        platform: "instagram",
      },
    ],
    topHashtags: [
      { tag: "#maternidad", avgEngagement: 45000, multiplier: 6.2 },
      { tag: "#wellness", avgEngagement: 31000, multiplier: 4.8 },
      { tag: "#mamablogger", avgEngagement: 22000, multiplier: 3.6 },
      { tag: "#vidanatural", avgEngagement: 17000, multiplier: 3.1 },
      { tag: "#organizacion", avgEngagement: 12000, multiplier: 2.4 },
    ],
    audienceTopics: [
      "Maternidad y crianza",
      "Bienestar y salud",
      "Organización familiar",
      "Alimentación saludable",
      "Equilibrio vida personal / trabajo",
    ],
    audienceWords: ["inspiradora", "gracias", "como tú lo haces", "cuántos años tiene", "igual que yo"],
    contentCategories: [
      "Maternidad",
      "Wellness",
      "Organización",
      "Recetas saludables",
      "Motivación",
    ],
    latestPostPerformance: {
      views: 560000,
      percentAboveAverage: 112,
      platform: "instagram",
    },
  },
];

export function getAllCreators(): Creator[] {
  return creators;
}

export function getCreatorBySlug(slug: string): Creator | undefined {
  return creators.find((c) => c.slug === slug);
}

export function validateCredentials(
  slug: string,
  password: string
): Creator | null {
  const creator = creators.find(
    (c) => c.slug === slug && c.password === password
  );
  return creator ?? null;
}

export function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
