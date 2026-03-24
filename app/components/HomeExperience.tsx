"use client";

import { useState } from "react";
import HeaderNav from "./HeaderNav";
import IntroOverlay from "./IntroOverlay";

export default function HomeExperience() {
  const [introVisible, setIntroVisible] = useState(true);
  const heroVideoSrc = encodeURI("/VIDEO PORTADA SIVAR MUSIC WEB 2.mp4");

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

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.42)_0%,rgba(0,0,0,0.12)_36%,rgba(0,0,0,0.34)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_42%,rgba(0,0,0,0.22)_100%)]" />

      <HeaderNav logoVisible={!introVisible} />

      <div className="relative z-10 min-h-screen" />

      {introVisible ? (
        <IntroOverlay onComplete={() => setIntroVisible(false)} />
      ) : null}
    </main>
  );
}
