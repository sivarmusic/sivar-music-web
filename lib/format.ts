// Formateo de moneda único para la ticketera (pantallas y correos).
// Solo presentación: los montos los calcula y valida el servidor.

function round2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

/** "$10" si es entero, "$12.50" si tiene centavos. */
export function formatMoney(value: number | string | null | undefined): string {
  const n = round2(Number(value) || 0)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/** Siempre con dos decimales: "$10.00", "$37.50" (montos de transferencia, correos). */
export function formatMoneyFull(value: number | string | null | undefined): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(round2(Number(value) || 0))
}

/** Total = cantidad × precio unitario, redondeado a centavos. */
export function orderTotal(cantidad: number, precio: number | string | null | undefined): number {
  return round2((Number(cantidad) || 0) * (Number(precio) || 0))
}
