import type { SupabaseClient } from '@supabase/supabase-js'

// Estados de orden que ocupan cupo. Las rechazadas liberan su lugar.
export const ACTIVE_ORDER_STATUSES = ['pendiente_comprobante', 'en_revision', 'confirmado'] as const

/**
 * DECISIÓN DE NEGOCIO (revisar con el dueño): una orden en `pendiente_comprobante`
 * retiene cupo solo durante estas horas desde su creación. Pasado el plazo deja
 * de contar para el aforo (no se borra ni cambia de estado; si sube comprobante
 * después, se re-chequea el cupo). Evita que órdenes abandonadas agoten el evento.
 */
export const PENDING_HOLD_HOURS = 72
export const PENDING_HOLD_MS = PENDING_HOLD_HOURS * 60 * 60 * 1000

/** ¿La orden está ocupando cupo ahora mismo? */
export function holdsCapacity(
  order: { status: string; created_at?: string | null },
  now: number = Date.now(),
): boolean {
  if (order.status === 'confirmado' || order.status === 'en_revision') return true
  if (order.status !== 'pendiente_comprobante') return false
  const created = order.created_at ? Date.parse(order.created_at) : NaN
  if (Number.isNaN(created)) return true // sin fecha: contar (falla cerrado)
  return now - created <= PENDING_HOLD_MS
}

export type CapacityCheck = { ok: true } | { ok: false; remaining: number; message: string }

/**
 * Verifica el aforo (events.max_entradas) contra la suma de `cantidad` de las
 * órdenes activas del evento. max_entradas null/0 = sin límite.
 *
 * Ojo: es check-then-insert, NO atómico. Dos compras simultáneas pueden pasar
 * el chequeo a la vez y exceder el cupo por unas pocas entradas. El cierre
 * total de esa ventana requiere la función SQL reserve_event_tickets
 * (scripts/eventos-integrity-1c.sql).
 */
export async function checkEventCapacity(
  db: SupabaseClient,
  eventId: string,
  maxEntradas: number | null | undefined,
  requested: number,
): Promise<CapacityCheck> {
  if (!maxEntradas || maxEntradas <= 0) return { ok: true }

  const { data, error } = await db
    .from('event_orders')
    .select('cantidad, status, created_at')
    .eq('event_id', eventId)
    .in('status', [...ACTIVE_ORDER_STATUSES])

  if (error) {
    // Ante la duda no vendemos de más: fallar cerrado.
    return { ok: false, remaining: 0, message: 'No se pudo verificar la disponibilidad. Intentá de nuevo.' }
  }

  const now = Date.now()
  const sold = (data ?? [])
    .filter(o => o.status !== 'pendiente_comprobante' || holdsCapacity(o, now))
    .reduce((sum, o) => sum + (Number(o.cantidad) || 0), 0)
  const remaining = Math.max(0, maxEntradas - sold)
  if (requested <= remaining) return { ok: true }

  return {
    ok: false,
    remaining,
    message: remaining === 0
      ? 'No quedan entradas disponibles'
      : `Quedan ${remaining} entradas disponibles`,
  }
}
