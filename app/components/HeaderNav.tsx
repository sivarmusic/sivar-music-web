"use client";

import Link from "next/link";
import { useState } from "react";
import HeaderLogo from "./HeaderLogo";

type HeaderNavProps = {
  logoPriority?: boolean;
  logoSizeClassName?: string;
  logoSizes?: string;
  logoVisible?: boolean;
};

export default function HeaderNav({
  logoPriority = false,
  logoSizeClassName = "w-[104px] sm:w-[130px] md:w-[147px]",
  logoSizes = "(min-width: 768px) 147px, (min-width: 640px) 130px, 104px",
  logoVisible = true,
}: HeaderNavProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [entertainmentOpen, setEntertainmentOpen] = useState(false);

  const toggleNav = () => setNavOpen((open) => !open);
  const closeNav = () => {
    setNavOpen(false);
    setEntertainmentOpen(false);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-30">
      <div className="pointer-events-none flex w-full items-start justify-between px-5 py-5 sm:px-6 md:px-10 md:py-6">
        <HeaderLogo
          href="/"
          hidden={!logoVisible}
          priority={logoPriority}
          sizeClassName={logoSizeClassName}
          sizes={logoSizes}
          className="pointer-events-auto"
        />

        <div className="pointer-events-auto relative">
          <button
            type="button"
            onClick={toggleNav}
            className="relative z-30 flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-full border border-white/10 bg-black/60 text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:border-white/20 hover:bg-black/72"
            aria-label={`${navOpen ? "Close" : "Open"} navigation menu`}
            aria-expanded={navOpen}
          >
            <span
              className={`block h-px w-5 bg-white transition ${
                navOpen ? "translate-y-1.5 rotate-45" : "-translate-y-1.5"
              }`}
            />
            <span
              className={`block h-px w-5 bg-white transition ${
                navOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`block h-px w-5 bg-white transition ${
                navOpen ? "-translate-y-1.5 -rotate-45" : "translate-y-1.5"
              }`}
            />
          </button>

          <nav
            className={`${
              navOpen ? "flex" : "hidden"
            } absolute right-0 top-[calc(100%+14px)] w-[min(84vw,19rem)] flex-col gap-4 rounded-[1.6rem] border border-white/10 bg-black/86 px-6 py-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/78 shadow-[0_22px_44px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:text-xs`}
          >
            <div className="w-full space-y-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-[12px] transition-colors duration-150 hover:text-white sm:text-[13px]"
                aria-haspopup="true"
                aria-expanded={entertainmentOpen}
                onClick={() => setEntertainmentOpen((open) => !open)}
              >
                ENTERTAINMENT
                <span className="text-base text-white/70">
                  {entertainmentOpen ? "−" : "+"}
                </span>
              </button>
              <div
                className={`flex flex-col gap-2 pl-2 text-[11px] transition-all duration-200 ease-out sm:text-xs ${
                  entertainmentOpen
                    ? "max-h-48 opacity-100"
                    : "max-h-0 overflow-hidden opacity-0"
                }`}
              >
                <Link
                  className="transition-colors duration-150 hover:text-white"
                  href="/artists"
                  onClick={closeNav}
                >
                  ARTISTS
                </Link>
                <Link
                  className="transition-colors duration-150 hover:text-white"
                  href="/releases"
                  onClick={closeNav}
                >
                  RELEASES
                </Link>
              </div>
            </div>
            <Link
              className="transition-colors duration-150 hover:text-white"
              href="#"
              onClick={closeNav}
            >
              NEWS
            </Link>
            <Link
              className="transition-colors duration-150 hover:text-white"
              href="/sound-for-films"
              onClick={closeNav}
            >
              SOUND FOR FILMS
            </Link>
            <Link
              className="transition-colors duration-150 hover:text-white"
              href="#"
              onClick={closeNav}
            >
              PUBLISHING
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
