import Link from "next/link";
import { notFound } from "next/navigation";
import HeaderNav from "../../components/HeaderNav";
import { artists } from "../../data/artists";

type Params = {
  slug: string;
};

export function generateStaticParams() {
  return artists.map((artist) => ({ slug: artist.slug }));
}

export default function ArtistDetailPage({ params }: { params: Params }) {
  const artist = artists.find((item) => item.slug === params.slug);

  if (!artist) {
    notFound();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className={`absolute inset-0 bg-gradient-to-br ${artist?.accent} opacity-15`} />
      <div className="absolute inset-0 bg-black/80" />

      <HeaderNav />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 pb-16 pt-28 md:px-10 md:pt-32">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-300">
            Entertainment
          </p>
          <h1 className="text-4xl font-black uppercase leading-none tracking-tight md:text-6xl">
            {artist?.name}
          </h1>
          <p className="text-sm font-semibold uppercase text-white/70">{artist?.genre}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
          <p className="text-base text-white/80">{artist?.summary}</p>
          <p className="mt-4 text-sm text-white/60">
            Full profile will live here once assets and bios are ready.
          </p>
        </div>

        <Link
          href="/artists"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white/35 hover:bg-white/10"
        >
          ← Back to artists
        </Link>
      </div>
    </main>
  );
}
