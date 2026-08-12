"use client";
import { usePlayer } from "@/app/voces/components/PlayerContext";

function formatTime(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0:00";
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function StickyPlayer() {
  const { current, playing, time, dur, toggle, seek, close } = usePlayer();

  if (!current) return null;

  const pct = dur > 0 ? (time / dur) * 100 : 0;

  return (
    <div
      className="fixed left-0 right-0 z-40 px-3 sm:px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 64px)" }}
    >
      <div
        className="mx-auto max-w-3xl rounded-[14px] shadow-2xl backdrop-blur-md"
        style={{ background: "rgba(18,18,20,0.92)", border: "0.5px solid var(--color-border-default)" }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <button
            onClick={toggle}
            aria-label={playing ? "Pausar" : "Reproducir"}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full transition-transform duration-150 hover:scale-[1.06]"
            style={{ background: "var(--color-accent)" }}
          >
            {playing ? (
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6 4h3v12H6V4zm5 0h3v12h-3V4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 ml-0.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.5 3.5v13l11-6.5-11-6.5z" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[12px] font-[500] truncate" style={{ color: "var(--color-text-primary)" }}>
                {current.name}
              </p>
              <span
                className="text-[10px] tabular-nums font-mono shrink-0"
                style={{ color: "var(--color-text-muted)" }}
              >
                {formatTime(time)}{dur > 0 ? ` / ${formatTime(dur)}` : ""}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={dur || 0}
              value={time}
              step="0.01"
              onChange={(e) => seek(Number(e.target.value || 0))}
              aria-label="Progreso"
              className="w-full h-1 appearance-none rounded-full cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--color-accent) ${pct}%, rgba(255,255,255,0.10) ${pct}%)`,
                accentColor: "var(--color-accent)",
              }}
            />
          </div>

          <button
            onClick={close}
            aria-label="Cerrar"
            className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full transition-colors hover:bg-white/5"
            style={{ color: "var(--color-text-muted)" }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.3 4.3a1 1 0 011.4 0L10 8.6l4.3-4.3a1 1 0 111.4 1.4L11.4 10l4.3 4.3a1 1 0 11-1.4 1.4L10 11.4l-4.3 4.3a1 1 0 11-1.4-1.4L8.6 10 4.3 5.7a1 1 0 010-1.4z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
