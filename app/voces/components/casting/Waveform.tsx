const BARS = 40;

// Hash simple y determinista del nombre del proyecto -> alturas de barras.
function heights(seed: string) {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < BARS; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    out.push(6 + Math.round(((h >>> 8) % 1000) / 1000 * 36));
  }
  return out;
}

/** Onda decorativa. `flat` = línea recta (casting cerrado); `error` = línea con picos. */
export default function Waveform({
  seed = "",
  flat = false,
  error = false,
  className = "",
}: {
  seed?: string;
  flat?: boolean;
  error?: boolean;
  className?: string;
}) {
  const cls = `cs-wave ${className}`.trim();
  if (error) {
    return (
      <svg viewBox="0 0 400 48" preserveAspectRatio="none" aria-hidden="true" className={cls}>
        <polyline
          points="0,24 120,24 130,24 140,6 150,42 160,12 170,24 400,24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }
  if (flat) {
    return (
      <svg viewBox="0 0 400 48" preserveAspectRatio="none" aria-hidden="true" className={cls}>
        <line x1={0} y1={24} x2={400} y2={24} stroke="currentColor" strokeWidth={3} vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }
  const hs = heights(seed);
  return (
    <svg viewBox="0 0 400 48" preserveAspectRatio="none" aria-hidden="true" className={cls}>
      {hs.map((h, i) => (
        <line
          key={i}
          x1={5 + i * 10}
          x2={5 + i * 10}
          y1={24 - h / 2}
          y2={24 + h / 2}
          stroke="currentColor"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
