import crypto from 'crypto'

export function buildTicketRows(orderId: string, orderCode: string, cantidad: number) {
  return Array.from({ length: cantidad }, (_, i) => ({
    order_id: orderId,
    order_code: orderCode,
    ticket_number: i + 1,
    qr_token: crypto.randomUUID(),
  }))
}

type Db = { from: (table: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Genera los tickets de una orden de forma idempotente: solo crea los números
 * que faltan, así confirmar dos veces o reintentar no duplica entradas.
 * Devuelve el error del insert (un 23505 por carrera se considera benigno).
 */
export async function ensureEventTickets(db: Db, orderId: string, orderCode: string, cantidad: number) {
  const { data: existing, error: readError } = await db
    .from('event_tickets')
    .select('ticket_number')
    .eq('order_id', orderId)
  if (readError) return { error: readError as { message: string; code?: string } }

  const have = new Set<number>((existing ?? []).map((t: { ticket_number: number }) => t.ticket_number))
  const missing = buildTicketRows(orderId, orderCode, cantidad).filter(r => !have.has(r.ticket_number))
  if (missing.length === 0) return { error: null }

  const { error } = await db.from('event_tickets').insert(missing)
  if (error && error.code !== '23505') return { error: error as { message: string; code?: string } }
  return { error: null }
}
