import Image from "next/image";
import Link from "next/link";
import HeaderNav from "../components/HeaderNav";
import { artists } from "../data/artists";

export default function ArtistsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
      <HeaderNav />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-28 md:px-10 md:pt-32">
        <div className="flex justify-center">
          <Image
            src="/SIVAR MUSIC ENTERTAINMENT LOGO BLANCO.svg"
            alt="Sivar Music Entertainment"
            width={520}
            height={132}
            className="h-auto w-full max-w-[180px] md:max-w-[260px]"
            priority
          />
        </div>

        <section className="max-w-3xl space-y-4 md:space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-300">
            Entertainment
          </p>
          <h1 className="text-4xl font-black uppercase leading-none tracking-tight drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)] md:text-6xl">
            Artists
          </h1>
          <p className="max-w-2xl text-base text-white/80 md:text-lg">
            Discover the lineup shaping Sivar Music Group. From breakout voices to established icons,
            dive into profiles, latest projects, and what is next on stage and in the studio.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <Link
              key={artist.slug}
              href={`/artists/${artist.slug}`}
              className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-lg transition hover:-translate-y-1 hover:border-white/30 hover:shadow-2xl"
            >
              <div className="relative h-64 overflow-hidden bg-white/5 md:h-72">
                <Image
                  src={artist.menuImage}
                  alt={artist.name}
                  fill
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                  className={`object-cover transition duration-500 group-hover:scale-[1.03] ${
                    artist.menuImageClassName ?? "object-center"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              </div>
              <div className="space-y-2 bg-black/60 px-4 py-4">
                <h3 className="text-lg font-semibold uppercase tracking-wide">{artist.name}</h3>
                <p className="text-xs font-semibold uppercase text-white/60">{artist.genre}</p>
                <p className="text-sm text-white/75">{artist.summary}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-pink-200">
                  View profile
                  <span aria-hidden>→</span>
                </span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
