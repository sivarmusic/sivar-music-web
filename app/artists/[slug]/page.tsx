import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import MonicaSinTildeProfile from "../../components/MonicaSinTildeProfile";
import HeaderNav from "../../components/HeaderNav";
import { artists } from "../../data/artists";

type ArtistPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return artists.map((artist) => ({ slug: artist.slug }));
}

export default async function ArtistDetailPage({ params }: ArtistPageProps) {
  const { slug } = await params;
  const artist = artists.find((item) => item.slug === slug);

  if (!artist) {
    notFound();
  }

  if (artist.profileMode === "mst-desktop") {
    return <MonicaSinTildeProfile />;
  }

  if (
    artist.profileMode === "background-only" &&
    artist.profileBackgroundImage
  ) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black text-white">
        <div className="absolute inset-0">
          <Image
            src={artist.profileBackgroundImage}
            alt={artist.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>

        <HeaderNav />

        <div className="relative z-10 min-h-screen" />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {artist.profileBackgroundImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-24"
          style={{ backgroundImage: `url("${artist.profileBackgroundImage}")` }}
        />
      ) : null}
      <div className={`absolute inset-0 bg-gradient-to-br ${artist.accent} opacity-15`} />
      <div className="absolute inset-0 bg-black/80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_32%),linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.62)_48%,rgba(0,0,0,0.88)_100%)]" />

      <HeaderNav />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-28 md:px-10 md:gap-14 md:pt-32">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.82fr)] lg:items-end">
          <div className="space-y-5 md:space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-300">
              SIVAR MUSIC ENTERTAINMENT
            </p>
            <div className="space-y-3">
              <h1 className="text-4xl font-black leading-none tracking-tight md:text-6xl">
                {artist.name}
              </h1>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/68">
                {artist.genre}
              </p>
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
              {artist.summary}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-[0_18px_48px_rgba(0,0,0,0.35)]">
            <div className="relative aspect-[4/5] w-full">
              <Image
                src={artist.menuImage}
                alt={artist.name}
                fill
                priority
                sizes="(min-width: 1024px) 34vw, 92vw"
                className={`object-cover ${artist.menuImageClassName ?? "object-center"}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
          </div>
        </section>

        <section className="grid gap-8 border-t border-white/10 pt-8 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.62fr)] md:pt-10">
          <div className="space-y-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/45">
              Perfil
            </p>
            <div className="space-y-4 text-sm leading-relaxed text-white/78 md:text-base">
              {artist.profileParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="space-y-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/45">
              Claves
            </p>
            <div className="flex flex-wrap gap-3">
              {artist.profileHighlights.map((highlight) => (
                <span
                  key={highlight}
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white/72"
                >
                  {highlight}
                </span>
              ))}
            </div>
            <Link
              href="/artists"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white transition hover:border-white/35 hover:bg-white/10"
            >
              ← Volver a artistas
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
