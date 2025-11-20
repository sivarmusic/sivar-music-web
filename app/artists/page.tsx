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
            className="h-auto w-full max-w-[360px] md:max-w-[520px]"
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
              <div
                className={`relative h-48 bg-gradient-to-br ${artist.accent} transition duration-300 group-hover:brightness-110`}
              >
                <div className="absolute inset-0 opacity-35" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.18),transparent_45%)]" />
                <div className="absolute inset-0 flex items-end">
                  <p className="p-4 text-4xl font-black uppercase text-white/85">
                    {artist.name.slice(0, 1)}
                  </p>
                </div>
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
