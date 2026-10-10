import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/staff-auth'
import { buildTicketRows } from '@/lib/eventTickets'
import { recordAudit } from '@/lib/audit'
import { checkEventCapacity } from '@/lib/eventCapacity'
import { parseCantidad } from '@/lib/eventValidation'
import { sendSafely } from '@/lib/email-safe'
import { sendTicketConfirmed } from '@/lib/email'

const CATEGORIAS = ['staff', 'organizacion', 'vip', 'musicos'] as const

export async function POST(req: NextRequest) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { event_id, categoria, nombre, cantidad, telefono, email } = await req.json()

  if (!event_id || !nombre?.trim() || !email?.trim() || !CATEGORIAS.includes(categoria)) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const cantidadFinal = parseCantidad(cantidad)
  if (cantidadFinal === null) {
    return NextResponse.json({ error: 'La cantidad debe ser un número entero entre 1 y 20' }, { status: 400 })
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, nombre, slug, venue, fecha, max_entradas')
    .eq('id', event_id)
    .single()

  if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })

  const capacity = await checkEventCapacity(supabase, event_id, event.max_entradas, cantidadFinal)
  if (!capacity.ok) {
    return NextResponse.json({ error: capacity.message, remaining: capacity.remaining }, { status: 409 })
  }

  const { data: order, error } = await supabase
    .from('event_orders')
    .insert({
      event_id,
      nombre: nombre.trim(),
      telefono: telefono?.trim() || null,
      email: email.trim(),
      cantidad: cantidadFinal,
      status: 'confirmado',
      order_type: 'cortesia',
      cortesia_categoria: categoria,
    })
    .select()
    .single()

  if (error) return serverError('eventos/orders/cortesia', error)

  // Quién emitió la cortesía (best-effort: requiere scripts/eventos-hardening-5.sql).
  await recordAudit(supabase, 'event_orders', order.id, { created_by: user.email ?? null })

  const { data: tickets, error: ticketsError } = await supabase
    .from('event_tickets')
    .insert(buildTicketRows(order.id, order.order_code, cantidadFinal))
    .select()

  if (ticketsError) return serverError('eventos/orders/cortesia', ticketsError)

  void sendSafely('ticket_confirmed_cortesia', order.order_code, () => sendTicketConfirmed({
    to: order.email,
    nombre: order.nombre,
    orderCode: order.order_code,
    eventName: event.nombre,
    eventDate: new Date(event.fecha).toLocaleString('es-SV', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
    eventVenue: event.venue,
    verUrl: 'https://sivarmusic.com/eventos/mi-cuenta',
  }))

  return NextResponse.json({ order, tickets })
}
