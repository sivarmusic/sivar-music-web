import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/staff-auth'
import { ensureEventTickets } from '@/lib/eventTickets'
import { recordAudit } from '@/lib/audit'
import { checkEventCapacity } from '@/lib/eventCapacity'
import { parseCantidad } from '@/lib/eventValidation'
import { sendSafely } from '@/lib/email-safe'
import { sendTicketConfirmed } from '@/lib/email'
import { EVENT_TZ } from '@/lib/eventDate'

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

  // Idempotencia ante reintento: si una cortesía idéntica (mismo evento, categoría,
  // nombre, email y cantidad) se creó en la última hora y quedó SIN todos sus
  // tickets (fallo parcial), se completa esa orden en vez de crear otra.
  const nombreFinal = nombre.trim()
  const emailFinal = email.trim()
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: prev, error: prevError } = await supabase
    .from('event_orders')
    .select('id, order_code, nombre, email, cantidad, event_tickets(id)')
    .eq('event_id', event_id)
    .eq('order_type', 'cortesia')
    .eq('cortesia_categoria', categoria)
    .eq('nombre', nombreFinal)
    .eq('email', emailFinal)
    .eq('cantidad', cantidadFinal)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5)
  if (prevError) return serverError('eventos/orders/cortesia', prevError)

  const incomplete = (prev ?? []).find(o => ((o.event_tickets as unknown[] | null)?.length ?? 0) < cantidadFinal)
  let order: { id: string; order_code: string; nombre: string; email: string }

  if (incomplete) {
    // Ya cuenta para el aforo: no se vuelve a chequear cupo.
    order = incomplete
  } else {
    const capacity = await checkEventCapacity(supabase, event_id, event.max_entradas, cantidadFinal)
    if (!capacity.ok) {
      return NextResponse.json({ error: capacity.message, remaining: capacity.remaining }, { status: 409 })
    }

    const { data: created, error } = await supabase
      .from('event_orders')
      .insert({
        event_id,
        nombre: nombreFinal,
        telefono: telefono?.trim() || null,
        email: emailFinal,
        cantidad: cantidadFinal,
        status: 'confirmado',
        order_type: 'cortesia',
        cortesia_categoria: categoria,
      })
      .select()
      .single()

    if (error) return serverError('eventos/orders/cortesia', error)
    order = created

    // Quién emitió la cortesía (best-effort: requiere scripts/eventos-hardening-5.sql).
    await recordAudit(supabase, 'event_orders', order.id, { created_by: user.email ?? null })
  }

  // Idempotente: solo crea los números que faltan.
  const { error: ticketsError } = await ensureEventTickets(supabase, order.id, order.order_code, cantidadFinal)
  if (ticketsError) return serverError('eventos/orders/cortesia', ticketsError)

  const { data: tickets } = await supabase
    .from('event_tickets')
    .select('*')
    .eq('order_id', order.id)
    .order('ticket_number', { ascending: true })

  void sendSafely('ticket_confirmed_cortesia', order.order_code, () => sendTicketConfirmed({
    to: order.email,
    nombre: order.nombre,
    orderCode: order.order_code,
    eventName: event.nombre,
    eventDate: new Date(event.fecha).toLocaleString('es-SV', { timeZone: EVENT_TZ, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
    eventVenue: event.venue,
    verUrl: 'https://sivarmusic.com/eventos/mi-cuenta',
  }))

  return NextResponse.json({ order, tickets })
}
