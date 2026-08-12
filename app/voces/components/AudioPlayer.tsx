"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/app/voces/components/I18n";
import { useOptionalPlayer } from "@/app/voces/components/PlayerContext";
import { normalizeDemoUrl } from "@/lib/voces-demo";

function formatTime(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0:00";
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function AudioPlayer({ src: rawSrc, ariaLabel, trackName }: { src?: string | null; ariaLabel?: string; trackName?: string }) {
  // Normalizamos la fuente (enlaces de Drive -> /api/voces/demo) para que el reproductor
  // funcione en todas las páginas, no solo en el catálogo principal.
  const src = useMemo(() => normalizeDemoUrl(rawSrc) || null, [rawSrc]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const { t } = useI18n();
  const triedFallbackRef = useRef(false);
  const [activeSrc, setActiveSrc] = useState<string | null>(null);
  const player = useOptionalPlayer();

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime || 0);
    const onLoad = () => setDur(a.duration || 0);
    const onEnd = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = async () => {
      try {
        const cur = audioRef.current;
        if (!cur) return;
        const srcUrl = cur.src;
        if (!srcUrl || !srcUrl.includes("/api/voces/demo?id=")) return;
        if ((cur as any)._triedRedirectFallback) return;
        (cur as any)._triedRedirectFallback = true;
        const u = new URL(srcUrl);
        u.searchParams.set("redirect", "1");
        cur.src = u.toString();
        await cur.play().catch(() => {});
      } catch {}
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoad);
    a.addEventListener("ended", onEnd);
    a.addEventListener("error", onError);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoad);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("error", onError);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [src]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = volume;
  }, [volume]);

  useEffect(() => {
    const a = audioRef.current;
    setPlaying(false);
    setTime(0);
    setDur(0);
    if (a) { a.pause(); a.currentTime = 0; }
    setActiveSrc(null);
  }, [src]);

  const ensureActive = async () => {
    const a = audioRef.current;
    if (!a || !src) return;
    if (!activeSrc) {
      setActiveSrc(src);
      await new Promise((r) => setTimeout(r, 0));
      a.load();
    }
  };

  const toggle = async () => {
    const a = audioRef.current;
    if (!a || !src) return;
    if (a.paused) {
      try {
        try {
          const nodes = Array.from(document.querySelectorAll("audio"));
          for (const el of nodes) { if (el !== a && !el.paused) el.pause(); }
        } catch {}
        await ensureActive();
        await a.play();
        setPlaying(true);
        if (player && src) {
          player.registerPlay(a, { id: src, name: trackName || ariaLabel || "Demo", src });
        }
      } catch (err) {
        if (!triedFallbackRef.current && typeof (activeSrc || src) === "string" && String(activeSrc || src).includes("/api/voces/demo?id=")) {
          triedFallbackRef.current = true;
          try {
            const u = new URL(String(activeSrc || src), window.location.origin);
            u.searchParams.set("redirect", "1");
            if (!activeSrc) setActiveSrc(u.toString());
            a.src = u.toString();
            await a.play();
            setPlaying(true);
            return;
          } catch {}
        }
        setPlaying(false);
      }
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value || 0);
    const a = audioRef.current;
    if (a) a.currentTime = v;
    setTime(v);
  };

  if (!src) return (
    <p className="mt-3 text-[11px]" style={{ color: "var(--color-text-muted)" }}>{t("noDemo")}</p>
  );

  const pct = dur > 0 ? (time / dur) * 100 : 0;

  return (
    <div className="mt-3 w-full">
      <div
        className="rounded-[9px] px-3 py-[10px]"
        style={{
          background: "var(--color-bg-subtle)",
          border: "0.5px solid var(--color-border-default)",
        }}
      >
        <div className="flex items-center gap-2.5">
          {/* Play button */}
          <button
            onClick={toggle}
            onMouseEnter={ensureActive}
            onFocus={ensureActive}
            aria-label={playing ? t("pause") : t("play")}
            className="w-[30px] h-[30px] shrink-0 flex items-center justify-center rounded-full transition-transform duration-150 hover:scale-[1.08]"
            style={{ background: "var(--color-accent)" }}
          >
            {playing ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6 4h3v12H6V4zm5 0h3v12h-3V4z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 ml-0.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.5 3.5v13l11-6.5-11-6.5z" />
              </svg>
            )}
          </button>

          {/* Waveform-style progress */}
          <div className="flex-1 min-w-0 relative">
            <input
              type="range"
              min={0}
              max={dur || 0}
              value={time}
              onChange={onSeek}
              step="0.01"
              className="w-full h-1 appearance-none rounded-full cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--color-accent) ${pct}%, rgba(255,255,255,0.12) ${pct}%)`,
                accentColor: "var(--color-accent)",
              }}
              aria-label={t("audioProgress")}
            />
          </div>

          {/* Time */}
          <span
            className="text-[11px] tabular-nums shrink-0 font-mono tracking-[0.04em]"
            style={{ color: "var(--color-text-muted)" }}
          >
            {formatTime(time)}
          </span>
        </div>
      </div>
      <audio ref={audioRef} src={activeSrc || undefined} preload="none" aria-label={ariaLabel} className="hidden" />
    </div>
  );
}
