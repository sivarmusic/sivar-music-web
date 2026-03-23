"use client";

import { useEffect, useEffectEvent, useState } from "react";
import HeaderLogo from "./HeaderLogo";

type IntroOverlayProps = {
  onComplete: () => void;
};

export default function IntroOverlay({ onComplete }: IntroOverlayProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const finishIntro = useEffectEvent(onComplete);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    const exitDelayMs = prefersReducedMotion ? 120 : 1825;
    const finishDelayMs = prefersReducedMotion ? 260 : 2360;

    const exitTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, exitDelayMs);

    const finishTimer = window.setTimeout(() => {
      finishIntro();
    }, finishDelayMs);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(finishTimer);
    };
  }, [prefersReducedMotion]);

  return (
    <div
      aria-hidden="true"
      className={`intro-overlay ${isExiting ? "intro-overlay--exit" : ""}`}
    >
      <div className="intro-overlay__inner">
        <HeaderLogo
          priority
          className="intro-overlay__logo"
          imageClassName="intro-overlay__logo-image"
          sizes="(min-width: 1024px) 540px, (min-width: 640px) 420px, 280px"
        />
      </div>
    </div>
  );
}
