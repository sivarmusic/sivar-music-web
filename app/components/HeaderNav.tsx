"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const logoSrc = encodeURI("/SIVAR MUSIC GROUP LOGO BLANCO.svg");

export default function HeaderNav() {
  const [navOpen, setNavOpen] = useState(false);
  const [entertainmentOpen, setEntertainmentOpen] = useState(false);

  const toggleNav = () => setNavOpen((open) => !open);
  const closeNav = () => {
    setNavOpen(false);
    setEntertainmentOpen(false);
  };

  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="flex w-full items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src={logoSrc}
            alt="Sivar Music Group logo"
            width={260}
            height={150}
            priority
            className="h-16 w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]"
          />
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={toggleNav}
          className="relative z-30 flex h-12 w-12 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-black/75 text-white shadow-lg ring-1 ring-white/10 transition hover:bg-black/85"
          aria-label={`${navOpen ? "Close" : "Open"} navigation menu`}
          aria-expanded={navOpen}
        >
          <span
            className={`block h-0.5 w-6 bg-white transition ${
                navOpen ? "translate-y-1.5 rotate-45" : "-translate-y-1.5"
              }`}
            />
            <span
              className={`block h-0.5 w-6 bg-white transition ${navOpen ? "opacity-0" : "opacity-100"}`}
            />
            <span
            className={`block h-0.5 w-6 bg-white transition ${
              navOpen ? "-translate-y-1.5 -rotate-45" : "translate-y-1.5"
            }`}
          />
        </button>

          <nav
            className={`${
              navOpen ? "flex" : "hidden"
            } absolute right-0 top-[calc(100%+12px)] w-72 flex-col gap-4 rounded-2xl bg-black/92 px-6 py-5 text-[12px] font-semibold uppercase tracking-wide drop-shadow-[0_14px_26px_rgba(0,0,0,0.7)] ring-1 ring-white/10 sm:text-sm`}
          >
            <div className="w-full space-y-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-[13px] transition-transform duration-150 hover:scale-[1.03] hover:text-pink-300 sm:text-base"
                aria-haspopup="true"
                aria-expanded={entertainmentOpen}
                onClick={() => setEntertainmentOpen((open) => !open)}
              >
                ENTERTAINMENT
                <span className="text-white/80 text-base">{entertainmentOpen ? "−" : "+"}</span>
              </button>
              <div
                className={`flex flex-col gap-2 pl-2 text-[12px] transition-all duration-200 ease-out sm:text-sm ${
                  entertainmentOpen ? "max-h-48 opacity-100" : "max-h-0 overflow-hidden opacity-0"
                }`}
              >
                <Link
                  className="transition-transform duration-150 hover:scale-[1.03] hover:text-pink-300"
                  href="/artists"
                  onClick={closeNav}
                >
                  ARTISTS
                </Link>
                <Link
                  className="transition-transform duration-150 hover:scale-[1.03] hover:text-pink-300"
                  href="/releases"
                  onClick={closeNav}
                >
                  RELEASES
                </Link>
              </div>
            </div>
            <Link
              className="transition-transform duration-150 hover:scale-[1.03] hover:text-pink-300"
              href="#"
              onClick={closeNav}
            >
              NEWS
            </Link>
            <Link
              className="transition-transform duration-150 hover:scale-[1.03] hover:text-pink-300"
              href="#"
              onClick={closeNav}
            >
              SOUND FOR FILMS
            </Link>
            <Link
              className="transition-transform duration-150 hover:scale-[1.03] hover:text-pink-300"
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
