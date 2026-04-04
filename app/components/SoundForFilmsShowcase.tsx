"use client";

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type TouchEvent,
  type WheelEvent,
} from "react";
import type { SoundForFilmsProject } from "../data/soundForFilmsProjects";
import SoundForFilmsPlayer from "./SoundForFilmsPlayer";
import SoundForFilmsSlide from "./SoundForFilmsSlide";

type SoundForFilmsShowcaseProps = {
  projects: SoundForFilmsProject[];
};

const WHEEL_LOCK_MS = 900;
const SWIPE_THRESHOLD = 52;

export default function SoundForFilmsShowcase({
  projects,
}: SoundForFilmsShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [exitingIndex, setExitingIndex] = useState<number | null>(null);
  const [playerProject, setPlayerProject] = useState<SoundForFilmsProject | null>(null);
  const [isShowcaseVisible, setIsShowcaseVisible] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const showcaseRef = useRef<HTMLElement>(null);
  const wheelLockedUntil = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const activeIndexRef = useRef(0);
  const exitingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const showcase = showcaseRef.current;

    if (!showcase) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsShowcaseVisible(entry.isIntersecting && entry.intersectionRatio > 0.25);
      },
      {
        threshold: [0, 0.25, 0.5, 0.75],
      }
    );

    observer.observe(showcase);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState === "visible");
    };

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (exitingTimeoutRef.current) {
        window.clearTimeout(exitingTimeoutRef.current);
      }
    };
  }, []);

  const commitSlideChange = (nextIndex: number) => {
    const currentIndex = activeIndexRef.current;

    if (nextIndex === currentIndex) {
      return;
    }

    setExitingIndex(currentIndex);

    if (exitingTimeoutRef.current) {
      window.clearTimeout(exitingTimeoutRef.current);
    }

    exitingTimeoutRef.current = window.setTimeout(() => {
      setExitingIndex(null);
      exitingTimeoutRef.current = null;
    }, 950);

    startTransition(() => {
      setActiveIndex(nextIndex);
    });
  };

  const moveBy = (direction: -1 | 1) => {
    const current = activeIndexRef.current;
    const nextIndex =
      current + direction < 0
        ? projects.length - 1
        : current + direction >= projects.length
          ? 0
          : current + direction;

    commitSlideChange(nextIndex);
  };

  const moveToIndex = (index: number) => {
    commitSlideChange(index);
  };

  const handleWindowKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (playerProject) {
      return;
    }

    const showcase = showcaseRef.current;

    if (!showcase) {
      return;
    }

    const bounds = showcase.getBoundingClientRect();
    const showcaseInView =
      bounds.top < window.innerHeight * 0.7 &&
      bounds.bottom > window.innerHeight * 0.3;

    if (!showcaseInView) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      moveBy(1);
    }

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      moveBy(-1);
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, []);

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (playerProject) {
      return;
    }

    if (Math.abs(event.deltaY) < 24) {
      return;
    }

    const now = Date.now();

    if (now < wheelLockedUntil.current) {
      event.preventDefault();
      return;
    }

    wheelLockedUntil.current = now + WHEEL_LOCK_MS;
    event.preventDefault();

    if (event.deltaY > 0) {
      moveBy(1);
      return;
    }

    moveBy(-1);
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (playerProject) {
      return;
    }

    const touch = event.changedTouches[0];

    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (playerProject) {
      return;
    }

    const initialTouch = touchStart.current;

    if (!initialTouch) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - initialTouch.x;
    const deltaY = touch.clientY - initialTouch.y;
    const dominantDelta =
      Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;

    touchStart.current = null;

    if (Math.abs(dominantDelta) < SWIPE_THRESHOLD) {
      return;
    }

    if (dominantDelta < 0) {
      moveBy(1);
      return;
    }

    moveBy(-1);
  };

  if (projects.length === 0) {
    return null;
  }

  const visibleIndexes =
    exitingIndex !== null && exitingIndex !== activeIndex
      ? [exitingIndex, activeIndex]
      : [activeIndex];

  const shouldLoadPreview = isShowcaseVisible && isDocumentVisible && !playerProject;

  return (
    <>
      <section
        id="sound-for-films-showcase"
        ref={showcaseRef}
        tabIndex={0}
        aria-label="Sound for Films showcase"
        aria-roledescription="carousel"
        className="relative isolate h-[100svh] overflow-hidden bg-black text-white outline-none"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {visibleIndexes.map((index) => {
          const project = projects[index];

          return (
            <SoundForFilmsSlide
              key={project.slug}
              project={project}
              isActive={index === activeIndex}
              shouldLoadPreview={shouldLoadPreview && index === activeIndex}
              onOpenPlayer={() => setPlayerProject(project)}
            />
          );
        })}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] sm:px-6 sm:pb-6 md:px-10 md:pb-8">
          <div className="pointer-events-auto flex items-center justify-between gap-2 sm:justify-end sm:gap-3">
            <div className="flex max-w-[calc(100vw-7.25rem)] items-center gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-sm sm:max-w-none sm:gap-2 sm:bg-black/22">
              {projects.map((project, index) => (
                <button
                  key={project.slug}
                  type="button"
                  onClick={() => moveToIndex(index)}
                  className={`h-2.5 w-2.5 shrink-0 rounded-full transition ${
                    index === activeIndex ? "bg-white" : "bg-white/28 hover:bg-white/52"
                  }`}
                  aria-label={`Go to ${project.title}`}
                  aria-pressed={index === activeIndex}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => moveBy(-1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/34 text-white transition hover:border-white/32 hover:bg-black/48 sm:h-11 sm:w-11 sm:bg-black/28"
                aria-label="Previous project"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => moveBy(1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/34 text-white transition hover:border-white/32 hover:bg-black/48 sm:h-11 sm:w-11 sm:bg-black/28"
                aria-label="Next project"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </section>

      {playerProject ? (
        <SoundForFilmsPlayer
          project={playerProject}
          onClose={() => setPlayerProject(null)}
        />
      ) : null}
    </>
  );
}
