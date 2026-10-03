import { useEffect, useState } from "react";

// Mismo cálculo que tenían las páginas de detalle (c/ y cc/): se movió acá
// para compartirlo entre detalle, formulario y gracias.
export function useCountdown(deadline: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  if (!deadline) return null;
  const diff = Math.max(0, new Date(deadline).getTime() - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, expired: diff === 0 };
}

export type Countdown = NonNullable<ReturnType<typeof useCountdown>>;

/** Fecha y hora de cierre con el mismo formato que usaba el detalle. */
export function formatDeadline(deadline: string) {
  const d = new Date(deadline);
  return {
    date: d.toLocaleString("es-AR", { day: "numeric", month: "long", year: "numeric" }),
    time: d.toLocaleString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}
