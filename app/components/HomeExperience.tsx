"use client";

import { useState } from "react";
import HeaderNav from "./HeaderNav";
import IntroOverlay from "./IntroOverlay";

export default function HomeExperience() {
  const [introVisible, setIntroVisible] = useState(true);
  const heroVideoSrc = "/video-portada-sivar-music-web.mp4";

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-[var(--foreground)]">
      <video
        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[1800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          introVisible ? "scale-[1.08]" : "scale-100"
        }`}
        autoPlay
        muted
        loop
        playsInline
        controls={false}
      >
        <source src={heroVideoSrc} type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.62)_58%,rgba(0,0,0,0.92)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.34)_48%,rgba(0,0,0,0.74)_100%)]" />

      <HeaderNav logoVisible={!introVisible} />

      <div className="relative z-10 flex min-h-screen flex-col">
        <section
          className={`mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-end px-6 pb-10 pt-28 transition-all duration-[950ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:pb-14 md:px-10 md:pb-16 md:pt-32 ${
            introVisible
              ? "translate-y-8 opacity-0"
              : "translate-y-0 opacity-100 delay-200"
          }`}
        >
          <div className="max-w-5xl">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.46em] text-white/55 sm:text-[0.72rem]">
              Creative House for Music, Film and Culture
            </p>
            <h1 className="mt-5 max-w-4xl font-editorial text-[3.35rem] leading-[0.92] tracking-[0.01em] text-white sm:text-[4.55rem] md:mt-7 md:text-[5.85rem] lg:text-[6.9rem]">
              A refined world where sound becomes image, atmosphere and story.
            </h1>
          </div>

          <div className="mt-10 grid gap-6 border-t border-white/12 pt-6 text-white/72 md:mt-12 md:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.75fr)] md:gap-10 md:pt-8">
            <p className="max-w-2xl text-sm leading-relaxed sm:text-base md:text-[1.02rem]">
              Sivar Music Group develops artists, builds visual language and
              produces music-led narratives with a cinematic, contemporary and
              editorial point of view.
            </p>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[0.68rem] font-medium uppercase tracking-[0.28em] text-white/48 sm:text-[0.74rem]">
              <span>Artist Development</span>
              <span className="text-right">Creative Direction</span>
              <span>Entertainment</span>
              <span className="text-right">Sound for Films</span>
              <span>Publishing</span>
              <span className="text-right">Visual Worlds</span>
            </div>
          </div>
        </section>
      </div>

      {introVisible ? (
        <IntroOverlay onComplete={() => setIntroVisible(false)} />
      ) : null}
    </main>
  );
}
