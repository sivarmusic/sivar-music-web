import Image from "next/image";
import HeaderNav from "./HeaderNav";

type ComingSoonPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export default function ComingSoonPage({
  eyebrow,
  title,
  description,
}: ComingSoonPageProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
      <HeaderNav />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pb-16 pt-28 text-center md:px-12">
        <Image
          src="/SIVAR MUSIC ENTERTAINMENT LOGO BLANCO.svg"
          alt="Sivar Music Entertainment"
          width={520}
          height={132}
          className="h-auto w-full max-w-[180px] md:max-w-[260px]"
          priority
        />

        <div className="mt-10 flex max-w-2xl flex-col items-center gap-4 md:gap-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-300">
            {eyebrow}
          </p>
          <h1 className="text-4xl font-black uppercase leading-none tracking-tight drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)] md:text-6xl">
            {title}
          </h1>
          <span className="inline-flex w-fit items-center rounded-full border border-white/14 bg-white/5 px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-white/60">
            En construcción
          </span>
          <p className="text-base text-white/70 md:text-lg">{description}</p>
        </div>
      </div>
    </main>
  );
}
