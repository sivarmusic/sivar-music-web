"use client";

import { useEffect, useRef, useState } from "react";
import type { SoundForFilmsProject } from "../data/soundForFilmsProjects";

type SoundForFilmsPlayerProps = {
  project: SoundForFilmsProject;
  onClose: () => void;
};

export default function SoundForFilmsPlayer({
  project,
  onClose,
}: SoundForFilmsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    const video = videoRef.current;

    if (video) {
      const startPlayback = async () => {
        try {
          await video.play();
          setIsReady(true);
        } catch {
          // Full playback may still require a second user interaction on some browsers.
        }
      };

      const handleCanPlay = () => {
        void startPlayback();
      };

      video.currentTime = 0;
      video.load();
      video.addEventListener("canplay", handleCanPlay);
      video.addEventListener("playing", handleCanPlay);

      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener("keydown", handleKeyDown);
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("playing", handleCanPlay);
        video.pause();
      };
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, project.videoSrc]);

  return (
    <div
      className="fixed inset-0 z-40 bg-black/96"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} full video player`}
    >
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-end px-4 pt-[calc(env(safe-area-inset-top)+0.9rem)] sm:px-6 sm:pt-5 md:px-10 md:py-6">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/46 text-white transition hover:border-white/28 hover:bg-black/52 sm:h-11 sm:w-11 sm:bg-black/34"
          aria-label="Close full player"
        >
          ✕
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-14 pt-[calc(env(safe-area-inset-top)+0.9rem)] sm:px-24 sm:pt-5 md:px-32 md:pt-6">
        <div className="max-w-[calc(100vw-5.5rem)] rounded-full border border-white/10 bg-black/46 px-4 py-2.5 text-center sm:max-w-[min(80vw,28rem)] sm:bg-black/34 sm:px-5 sm:py-3">
          <h2 className="text-sm font-black uppercase leading-none tracking-[-0.04em] text-white sm:text-base md:text-2xl">
            {project.title}
          </h2>
        </div>
      </div>

      <div className="flex h-full items-center justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+4.5rem)] sm:px-6 sm:pb-6 sm:pt-24 md:px-10 md:pb-10 md:pt-28">
        <div
          className="relative w-full max-w-6xl overflow-hidden rounded-[1rem] border border-white/10 bg-black sm:rounded-[1.2rem]"
          onClick={(event) => event.stopPropagation()}
        >
          {!isReady ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-white/45">
                Loading Video
              </div>
            </div>
          ) : null}

          <video
            ref={videoRef}
            src={project.videoSrc}
            className="h-full max-h-[calc(100svh-7.5rem)] w-full bg-black object-contain sm:max-h-[82vh]"
            controls
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
          />
        </div>
      </div>
    </div>
  );
}
