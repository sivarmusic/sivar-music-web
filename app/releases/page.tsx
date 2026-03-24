import Image from "next/image";
import HeaderNav from "../components/HeaderNav";

export default function ReleasesPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=2000&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-black/55" />

      <HeaderNav />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-6 pb-16 pt-28 md:px-12">
        <div className="flex w-full justify-center">
          <Image
            src="/SIVAR MUSIC ENTERTAINMENT LOGO BLANCO.svg"
            alt="Sivar Music Entertainment"
            width={520}
            height={132}
            className="h-auto w-full max-w-[180px] md:max-w-[260px]"
            priority
          />
        </div>

        <div className="mt-10 w-full max-w-3xl space-y-4 md:space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-200">
            Entertainment
          </p>
          <h1 className="text-4xl font-black uppercase leading-none tracking-tight drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)] md:text-6xl">
            Releases
          </h1>
          <p className="max-w-2xl text-base text-white/80 md:text-lg">
            Explore the latest drops from our roster—albums, singles, and
            collaborations ready to stream. Stay tuned for upcoming dates and
            exclusive previews.
          </p>
        </div>
      </div>
    </main>
  );
}
