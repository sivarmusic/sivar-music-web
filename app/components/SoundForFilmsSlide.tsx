"use client";

import { useEffect, useRef } from "react";
import type { SoundForFilmsProject } from "../data/soundForFilmsProjects";

type SoundForFilmsSlideProps = {
  project: SoundForFilmsProject;
  isActive: boolean;
  shouldLoadPreview: boolean;
  onOpenPlayer: () => void;
};

export default function SoundForFilmsSlide({
  project,
  isActive,
  shouldLoadPreview,
  onOpenPlayer,
}: SoundForFilmsSlideProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const PREVIEW_DURATION_SECONDS = 6;
  const compactTitleLength = project.title.replace(/\s+/g, "").length;
  const mobileTitleSizeClassName =
    compactTitleLength >= 10
      ? "text-[clamp(1.95rem,11vw,2.7rem)]"
      : compactTitleLength >= 8
        ? "text-[clamp(2.2rem,12vw,3rem)]"
        : "text-[clamp(2.4rem,14vw,3.6rem)]";

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const handleTimeUpdate = () => {
      if (video.currentTime >= PREVIEW_DURATION_SECONDS) {
        video.currentTime = 0;
        void video.play().catch(() => {
          // Some browsers may delay restarting the muted preview.
        });
      }
    };

    const attemptPlayback = async () => {
      try {
        await video.play();
      } catch {
        // Browsers can reject autoplay before enough data is buffered.
      }
    };

    if (!shouldLoadPreview) {
      video.pause();

      if (!isActive && video.currentTime > 0) {
        video.currentTime = 0;
      }

      return;
    }

    const handleCanPlay = () => {
      void attemptPlayback();
    };

    video.muted = true;
    video.currentTime = 0;
    video.load();
    void attemptPlayback();
    video.addEventListener("loadeddata", handleCanPlay);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("loadeddata", handleCanPlay);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [PREVIEW_DURATION_SECONDS, isActive, project.previewVideoSrc, shouldLoadPreview]);

  return (
    <article
      aria-hidden={!isActive}
      className={`absolute inset-0 transition-opacity duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isActive ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-black" />

      <video
        ref={videoRef}
        key={project.previewVideoSrc}
        src={project.previewVideoSrc}
        className={`absolute inset-0 h-full w-full cursor-pointer object-cover transition-[opacity,transform] duration-[1300ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isActive ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"
        }`}
        muted
        loop
        playsInline
        controls={false}
        preload={shouldLoadPreview ? "metadata" : "none"}
        onClick={onOpenPlayer}
      />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.28)_32%,rgba(0,0,0,0.16)_48%,rgba(0,0,0,0.86)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(214,207,191,0.16)_0%,transparent_32%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08)_0%,transparent_28%)]" />

      <div
        className={`pointer-events-auto absolute right-4 top-[calc(env(safe-area-inset-top)+4.75rem)] z-20 hidden transition-all delay-150 duration-700 ease-out sm:block md:right-10 md:top-32 ${
          isActive ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={onOpenPlayer}
          className="inline-flex min-h-10 items-center rounded-full border border-white/12 bg-black/28 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/78 transition hover:border-white/28 hover:bg-black/46"
        >
          Open Film
        </button>
      </div>

      <div className="pointer-events-none relative z-10 flex h-full flex-col justify-end px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-[calc(env(safe-area-inset-top)+6rem)] sm:px-6 sm:pb-28 sm:pt-28 md:px-10 md:pb-28 md:pt-32">
        <div
          className={`max-w-5xl transition-all delay-75 duration-700 ease-out ${
            isActive ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <h2
            className={`max-w-full font-black uppercase leading-[0.88] tracking-[-0.06em] text-white [text-shadow:0_18px_48px_rgba(0,0,0,0.62)] sm:max-w-5xl sm:text-[clamp(3rem,9vw,7.4rem)] ${mobileTitleSizeClassName}`}
          >
            {project.title}
          </h2>
          {project.description ? (
            <div className="mt-4 max-w-[18rem] space-y-1.5 sm:mt-5 sm:max-w-xl sm:space-y-2">
              <p className="text-[0.78rem] leading-relaxed text-white/74 sm:text-sm md:text-base">
                {project.description}
              </p>
              {project.partnerCredit ? (
                <p className="max-w-[15rem] text-[0.64rem] font-medium leading-relaxed tracking-[0.08em] text-white/52 sm:max-w-xl sm:text-[0.7rem]">
                  {project.partnerCredit}
                </p>
              ) : null}
            </div>
          ) : project.partnerCredit ? (
            <p className="mt-4 max-w-[15rem] text-[0.64rem] font-medium leading-relaxed tracking-[0.08em] text-white/52 sm:mt-5 sm:max-w-xl sm:text-[0.7rem]">
              {project.partnerCredit}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
