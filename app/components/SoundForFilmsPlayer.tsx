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
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-end px-5 py-5 sm:px-6 md:px-10 md:py-6">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-black/34 text-white transition hover:border-white/28 hover:bg-black/52"
          aria-label="Close full player"
        >
          ✕
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-20 pt-5 sm:px-24 md:px-32 md:pt-6">
        <div className="rounded-full border border-white/10 bg-black/34 px-5 py-3 text-center backdrop-blur-sm">
          <h2 className="text-base font-black uppercase tracking-[-0.04em] text-white md:text-2xl">
            {project.title}
          </h2>
        </div>
      </div>

      <div className="flex h-full items-center justify-center px-4 pb-6 pt-24 sm:px-6 md:px-10 md:pb-10 md:pt-28">
        <div
          className="relative w-full max-w-6xl overflow-hidden rounded-[1.2rem] border border-white/10 bg-black"
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
            className="h-full max-h-[82vh] w-full bg-black object-contain"
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
