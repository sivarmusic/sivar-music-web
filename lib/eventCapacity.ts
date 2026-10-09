import type { SupabaseClient } from '@supabase/supabase-js'

// Estados de orden que ocupan cupo. Las rechazadas liberan su lugar.
export const ACTIVE_ORDER_STATUSES = ['pendiente_comprobante', 'en_revision', 'confirmado'] as const

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
    .select('cantidad')
    .eq('event_id', eventId)
    .in('status', [...ACTIVE_ORDER_STATUSES])

  if (error) {
    // Ante la duda no vendemos de más: fallar cerrado.
    return { ok: false, remaining: 0, message: 'No se pudo verificar la disponibilidad. Intentá de nuevo.' }
  }

  const sold = (data ?? []).reduce((sum, o) => sum + (Number(o.cantidad) || 0), 0)
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
