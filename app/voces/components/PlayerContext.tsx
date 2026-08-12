"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type TrackMeta = {
  id: string;
  name: string;
  src: string;
};

type PlayerCtx = {
  current: TrackMeta | null;
  playing: boolean;
  time: number;
  dur: number;
  registerPlay: (audio: HTMLAudioElement, meta: TrackMeta) => void;
  toggle: () => void;
  seek: (sec: number) => void;
  close: () => void;
};

const Ctx = createContext<PlayerCtx | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<TrackMeta | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  const attachEvents = useCallback((a: HTMLAudioElement) => {
    const onTime = () => setTime(a.currentTime || 0);
    const onLoad = () => setDur(a.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoad);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoad);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const registerPlay = useCallback((audio: HTMLAudioElement, meta: TrackMeta) => {
    if (audioRef.current === audio) {
      setCurrent(meta);
      setDur(audio.duration || 0);
      setTime(audio.currentTime || 0);
      setPlaying(!audio.paused);
      return;
    }
    audioRef.current = audio;
    setCurrent(meta);
    setDur(audio.duration || 0);
    setTime(audio.currentTime || 0);
    setPlaying(!audio.paused);
    const detach = attachEvents(audio);
    (audio as any)._stickyDetach?.();
    (audio as any)._stickyDetach = detach;
  }, [attachEvents]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, []);

  const seek = useCallback((sec: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = sec;
    setTime(sec);
  }, []);

  const close = useCallback(() => {
    const a = audioRef.current;
    if (a) { try { a.pause(); } catch {} }
    setCurrent(null);
    setPlaying(false);
    setTime(0);
    setDur(0);
  }, []);

  const value = useMemo(() => ({ current, playing, time, dur, registerPlay, toggle, seek, close }),
    [current, playing, time, dur, registerPlay, toggle, seek, close]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const v = useContext(Ctx);
  if (!v) throw new Error("PlayerProvider missing");
  return v;
}

// Optional version that does not throw when used outside provider (for AudioPlayer fallback).
export function useOptionalPlayer(): PlayerCtx | null {
  return useContext(Ctx);
}
