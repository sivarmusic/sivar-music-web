// Formateadores para el reporte (client-safe).
// Reglas: miles con punto (1.800.000), porcentajes con 1 decimal (73.4%),
// fechas DD/MM/YYYY, moneda "$1.800.000 ARS" / "USD 200".
//
// Ported verbatim from voces-bds's lib/reportes/format.ts.

export function fmtNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("es-AR").format(Math.round(n));
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "0%";
  return `${n.toFixed(1)}%`;
}

export function fmtMoney(n: number | null | undefined, currency?: string | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const num = fmtNum(n);
  if (currency === "USD") return `USD ${num}`;
  if (currency === "ARS") return `$${num} ARS`;
  return `$${num}`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Si es fecha pura (YYYY-MM-DD) la formateamos directo, sin pasar por Date
  // (evita el corrimiento de un día por zona horaria).
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  // Getters UTC para que la fecha mostrada no dependa de la zona del visor.
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// "2026-08" -> "ago 26"
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fmtMonthShort(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  const idx = Number(m) - 1;
  if (idx < 0 || idx > 11) return yyyymm;
  return `${MESES[idx]} ${y.slice(2)}`;
}

// "2026-08-04" -> "04/08"
export function fmtDayShort(yyyymmdd: string): string {
  const [, m, d] = yyyymmdd.split("-");
  if (!d || !m) return yyyymmdd;
  return `${d}/${m}`;
}
