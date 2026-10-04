import type { Countdown } from "./useCountdown";

const pad = (n: number) => String(n).padStart(2, "0");

/** Cuenta regresiva DD:HH:MM:SS. `closed` muestra 00:00:00:00 tachado. */
export default function Timecode({
  countdown,
  closed = false,
  size = "md",
  label,
}: {
  countdown: Countdown | null;
  closed?: boolean;
  size?: "lg" | "md" | "sm" | "xs";
  label: string;
}) {
  const c = closed || !countdown ? { days: 0, hours: 0, minutes: 0, seconds: 0 } : countdown;
  const parts = [
    { v: c.days, l: "días" },
    { v: c.hours, l: "hs" },
    { v: c.minutes, l: "min" },
    { v: c.seconds, l: "seg" },
  ];
  return (
    <div
      role="timer"
      aria-label={label}
      className={`cs-tc cs-tc--${size}${closed ? " cs-tc--closed" : ""}`}
    >
      {parts.map((p, i) => (
        <span key={p.l} className="cs-tc-group">
          {i > 0 ? <span aria-hidden="true" className="cs-tc-sep">:</span> : null}
          <span className="cs-tc-cell">
            <span className="cs-tc-clip" aria-hidden="true">
              {/* key = valor: al cambiar el segundo el dígito "rueda" (solo transform/opacity) */}
              <span key={i === 3 && !closed ? p.v : "s"} className={`cs-tc-num${i === 3 && !closed ? " cs-tc-num--sec cs-tc-roll" : ""}`}>{pad(p.v)}</span>
            </span>
            <span aria-hidden="true" className="cs-tc-label">{p.l}</span>
          </span>
        </span>
      ))}
    </div>
  );
}
