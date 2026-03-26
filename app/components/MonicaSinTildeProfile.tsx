"use client";

import { useRef, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

type PositionedAsset = {
  src: string;
  alt: string;
  width: number;
  left: number;
  top: number;
  href?: string;
  zIndex?: number;
  rotate?: number;
  pixelated?: boolean;
  clipPath?: string;
};

const marqueeHueOffsets = [0, 72, 144, 216, 288];

const marqueeStepRem = 30;
const homeLogoSrc = encodeURI("/SIVAR MUSIC ENTERTAINMENT LOGO BLANCO.svg");
const catsWindowSrc = encodeURI("/MST-WEB/ELEMENTOS/d847072c46daf00241bf460b5dcda833.jpg");
const catSoundSources = [
  encodeURI("/MST-WEB/ELEMENTOS/miau-1.m4a"),
  encodeURI("/MST-WEB/ELEMENTOS/miau-2.m4a"),
  encodeURI("/MST-WEB/ELEMENTOS/miau-3.m4a"),
];

const iconAssets: PositionedAsset[] = [
  {
    src: encodeURI("/MST-WEB/ELEMENTOS/8bitSnap2.jpg"),
    alt: "Snapchat icon",
    width: 2.3,
    left: 4.15,
    top: 7.2,
    zIndex: 3,
    pixelated: true,
  },
  {
    src: encodeURI("/MST-WEB/ELEMENTOS/Youtube2.jpg"),
    alt: "YouTube",
    width: 2.45,
    left: 8.35,
    top: 7.2,
    href: "https://www.youtube.com/@monicasintilde",
    zIndex: 3,
    pixelated: true,
  },
  {
    src: encodeURI("/MST-WEB/ELEMENTOS/spotify8bit2.jpg"),
    alt: "Spotify",
    width: 2.25,
    left: 4.1,
    top: 14.9,
    href: "https://open.spotify.com/artist/04WdLIgnY3N1Tj99Sc5jFV?si=n-rvW_TrQ_GtJ_kNmSg1Fw",
    zIndex: 3,
    pixelated: true,
  },
  {
    src: encodeURI("/MST-WEB/ELEMENTOS/chrome.jpg"),
    alt: "Linktree",
    width: 2.05,
    left: 8.55,
    top: 14.9,
    href: "https://linktr.ee/monicasintilde",
    zIndex: 3,
    pixelated: true,
  },
  {
    src: encodeURI("/MST-WEB/ELEMENTOS/433-4335296_instagram-logo-pixel.jpg"),
    alt: "Instagram",
    width: 2.05,
    left: 4.2,
    top: 22.55,
    href: "https://www.instagram.com/_monicasintilde",
    zIndex: 3,
    pixelated: true,
  },
  {
    src: encodeURI("/MST-WEB/ELEMENTOS/tiktok-logo---tiktok-logo-_-pixel-art-maker42.jpg"),
    alt: "TikTok",
    width: 2.05,
    left: 8.55,
    top: 22.55,
    href: "https://www.tiktok.com/@monicasintilde_",
    zIndex: 3,
    pixelated: true,
  },
];

const windowAssets: PositionedAsset[] = [
  {
    src: encodeURI("/MST-WEB/ELEMENTOS/164419dcb24b474ad45708db165b30701.png"),
    alt: "Top left window collage",
    width: 31.8,
    left: 15.9,
    top: 5.1,
    zIndex: 2,
  },
  {
    src: encodeURI("/MST-WEB/ELEMENTOS/c86d6c487d345d32247ef3b0e87f572c.jpg"),
    alt: "Alert window",
    width: 18.8,
    left: 10.5,
    top: 26.3,
    zIndex: 4,
    rotate: -0.5,
  },
  {
    src: encodeURI("/MST-WEB/ELEMENTOS/cdcdb43b6540e33aced581d4de1b456a.png"),
    alt: "Top right pink collage",
    width: 25.8,
    left: 66.2,
    top: 13.2,
    zIndex: 2,
  },
  {
    src: encodeURI("/MST-WEB/ELEMENTOS/4201889dd21cef6208844714003882f7.jpg"),
    alt: "Everyone hates you window",
    width: 22,
    left: 0.9,
    top: 53.3,
    zIndex: 2,
  },
  {
    src: encodeURI("/MST-WEB/ELEMENTOS/a645993f609b4333f164a7e6cf482d49.jpg"),
    alt: "Paint window portrait",
    width: 15.1,
    left: 51.1,
    top: 37.5,
    zIndex: 4,
  },
  {
    src: encodeURI("/MST-WEB/ELEMENTOS/2ea0c9ffc36bb2661ae47d57b8ef221c.png"),
    alt: "Error stack",
    width: 13.5,
    left: 37.4,
    top: 68.6,
    zIndex: 1,
    rotate: -0.4,
  },
  {
    src: encodeURI("/MST-WEB/ELEMENTOS/no entiendo _player.png"),
    alt: "No entiendo player window",
    width: 24.4,
    left: 67,
    top: 68.6,
    zIndex: 3,
  },
];

function Asset({
  src,
  alt,
  width,
  left,
  top,
  href,
  zIndex = 1,
  rotate = 0,
  pixelated = false,
  clipPath,
}: PositionedAsset) {
  const sharedStyle = {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    zIndex,
    transform: `rotate(${rotate}deg)`,
    clipPath,
  } as const;

  const image = (
    <Image
      src={src}
      alt={href ? "" : alt}
      width={1600}
      height={1200}
      sizes="(min-width: 1280px) 28vw, (min-width: 768px) 24vw, 36vw"
      className={`h-auto w-full select-none drop-shadow-[0_14px_22px_rgba(0,0,0,0.18)] ${
        pixelated ? "[image-rendering:pixelated]" : ""
      }`}
    />
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={alt}
        className="absolute block transition-transform duration-150 hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f908e]"
        style={sharedStyle}
      >
        {image}
      </a>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="absolute"
      style={sharedStyle}
    >
      {image}
    </div>
  );
}

function CatsAudioWindow() {
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  function playSound(index: number) {
    const target = audioRefs.current[index];

    if (!target) {
      return;
    }

    audioRefs.current.forEach((audio, audioIndex) => {
      if (!audio || audioIndex === index) {
        return;
      }

      audio.pause();
      audio.currentTime = 0;
    });

    target.currentTime = 0;
    void target.play().catch(() => {});
  }

  return (
    <div
      aria-label="Cats soundboard"
      className="absolute"
      style={{
        left: "20%",
        top: "68.8%",
        width: "13.3%",
        zIndex: 2,
      }}
    >
      <div className="relative">
        <Image
          src={catsWindowSrc}
          alt="Cats window"
          width={247}
          height={165}
          sizes="(min-width: 1280px) 15vw, (min-width: 768px) 13vw, 18vw"
          className="h-auto w-full select-none drop-shadow-[0_14px_22px_rgba(0,0,0,0.18)]"
        />

        {[
          { left: "9%", label: "Play miau 1" },
          { left: "39.5%", label: "Play miau 2" },
          { left: "70%", label: "Play miau 3" },
        ].map((button, index) => (
          <button
            key={button.label}
            type="button"
            aria-label={button.label}
            className="absolute top-[80.5%] h-[11.8%] w-[20.5%] cursor-pointer rounded-[2px] bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200/90 focus-visible:ring-offset-1 focus-visible:ring-offset-[#e9ebff]"
            style={{ left: button.left }}
            onClick={() => playSound(index)}
          />
        ))}

        {catSoundSources.map((src, index) => (
          <audio
            key={src}
            ref={(element) => {
              audioRefs.current[index] = element;
            }}
            preload="auto"
            className="hidden"
          >
            <source src={src} type="audio/mp4" />
          </audio>
        ))}
      </div>
    </div>
  );
}

function SideMarquee({
  side,
  gutterWidth,
  marqueeWidth,
}: {
  side: "left" | "right";
  gutterWidth: string;
  marqueeWidth: string;
}) {
  const phrase = "monica sin tilde";
  const setHeightRem = marqueeHueOffsets.length * marqueeStepRem;

  return (
    <div
      aria-hidden="true"
      className={`mst-marquee mst-marquee--${side}`}
      style={{
        width: marqueeWidth,
        [side]: `calc((${gutterWidth} - ${marqueeWidth}) / 2)`,
      }}
    >
      <div
        className="mst-marquee__track"
        style={{ height: `${setHeightRem * 2}rem` }}
      >
        {[0, 1].flatMap((setIndex) =>
          marqueeHueOffsets.map((hueOffset, index) => {
            const wordIndex = setIndex * marqueeHueOffsets.length + index;

            return (
              <span
                key={`${side}-${setIndex}-${hueOffset}-${index}`}
                className="mst-marquee__word"
                style={
                  {
                    top: `${(wordIndex + 0.5) * marqueeStepRem}rem`,
                    "--marquee-delay": `${wordIndex * -1.35}s`,
                    "--marquee-hue": `${hueOffset}deg`,
                  } as CSSProperties
                }
              >
                {phrase}
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function MonicaSinTildeProfile() {
  const artboardWidth = "min(100vw, calc(100vh * 16 / 9))";
  const gutterWidth = `max(calc((100vw - ${artboardWidth}) / 2), 0px)`;
  const marqueeWidth = `min(clamp(3.8rem, 5vw, 5.75rem), ${gutterWidth})`;

  return (
    <main className="relative h-screen overflow-hidden bg-[#0f908e] text-white">
      <section className="relative h-full w-full overflow-hidden">
        <SideMarquee
          side="left"
          gutterWidth={gutterWidth}
          marqueeWidth={marqueeWidth}
        />
        <SideMarquee
          side="right"
          gutterWidth={gutterWidth}
          marqueeWidth={marqueeWidth}
        />

        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: artboardWidth,
            height: "min(100vh, calc(100vw * 9 / 16))",
          }}
        >
          <div className="relative h-full w-full overflow-hidden">
            <Image
              src={encodeURI("/MST-WEB/ELEMENTOS/MST SIN FONDO WHITE.jpg")}
              alt="monica sin tilde background"
              fill
              priority
              sizes="100vw"
              className="object-fill"
            />

            <Link
              href="/"
              aria-label="Volver al inicio"
              className="absolute right-[1.8%] top-[2.1%] z-[9] block transition-transform duration-150 hover:-translate-y-px focus-visible:-translate-y-px focus-visible:outline-none"
              style={{ width: "clamp(88px, 11.4%, 162px)" }}
            >
              <span className="relative block rounded-[4px] border border-white/28 bg-[linear-gradient(180deg,rgba(56,62,79,0.88)_0%,rgba(24,29,43,0.76)_100%)] px-[0.45rem] py-[0.38rem] shadow-[0_0_0_1px_rgba(255,255,255,0.08),3px_3px_0_rgba(22,26,39,0.32)] backdrop-blur-[2px]">
                <span className="pointer-events-none absolute inset-x-[2px] top-[2px] h-[1px] bg-white/28" />
                <Image
                  src={homeLogoSrc}
                  alt="Sivar Music Entertainment"
                  width={9952}
                  height={2443}
                  sizes="(min-width: 768px) 162px, 88px"
                  className="relative z-[1] h-auto w-full object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
                />
              </span>
            </Link>

            {iconAssets.map((asset) => (
              <Asset key={`${asset.src}-${asset.left}-${asset.top}`} {...asset} />
            ))}

            <CatsAudioWindow />

            {windowAssets.map((asset) => (
              <Asset key={`${asset.src}-${asset.left}-${asset.top}`} {...asset} />
            ))}

            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 z-[7]"
            >
              <Image
                src={encodeURI("/MST-WEB/ELEMENTOS/Layer 3.jpg")}
                alt="Taskbar"
                width={1920}
                height={42}
                sizes="100vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
